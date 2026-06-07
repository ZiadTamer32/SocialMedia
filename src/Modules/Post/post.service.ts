import { ICreatePostDto, IGetPostsDto, IUpdatePostDto } from "./post.dto.js";
import UserRepo from "../../DB/repositories/user.repo.js";
import PostRepo from "../../DB/repositories/post.repo.js";
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "../../Common/exceptions/domain.exception.js";
import RedisRepo from "../../DB/repositories/redis.repo.js";
import FirebaseService from "../../Common/FireBase/firebase.service.js";
import S3BucketSerivce from "../../Common/S3Bucket/s3bucket.service.js";
import { PostModel } from "../../DB/Models/post.model.js";
import { HUser } from "../../DB/Models/user.model.js";
import { Types } from "mongoose";
import { ReactionEnum } from "../../Common/enums/index.js";

class PostService {
  private _userRepo: typeof UserRepo;
  private _postRepo: typeof PostRepo;
  private _redisRepo: typeof RedisRepo;
  private _firebaseService: typeof FirebaseService;
  private _s3BucketService: typeof S3BucketSerivce;

  constructor() {
    this._userRepo = UserRepo;
    this._postRepo = PostRepo;
    this._redisRepo = RedisRepo;
    this._firebaseService = FirebaseService;
    this._s3BucketService = S3BucketSerivce;
  }

  private async _handleTagNotifications(tags: string[]) {
    // 1. Create an array of promises to fetch tokens for each tagged user
    const tokenPromises = tags.map((tagId) =>
      this._redisRepo.getSet(`FCMToken::${tagId}`),
    );

    // 2. Wait for all Redis queries to finish. This gives us an array of arrays (since each user might have multiple tokens)
    const tokensArrays = await Promise.all(tokenPromises);

    // 3. Flatten the array of arrays into a single list and remove any undefined/null values
    const allTokens = tokensArrays.flat().filter(Boolean) as string[];

    // 4. Send the notification to all collected tokens using sendNotifications (plural)
    if (allTokens.length > 0) {
      await this._firebaseService.sendNotifications({
        tokens: allTokens,
        title: "New Tag",
        body: `A user tagged you in a new post`,
      });
    }
  }

  async createPost(bodyData: ICreatePostDto, userId: string) {
    const { tags, content, privacy, attachments } = bodyData;

    if (tags && tags.length > 0) {
      const mentionedUsers = await this._userRepo.find({
        filter: { _id: { $in: tags } },
      });

      if (mentionedUsers.length !== tags.length) {
        throw new BadRequestException("One or more tagged users are invalid");
      }

      try {
        await this._handleTagNotifications(tags);
      } catch (error) {
        console.error("Failed to send tag notifications:", error);
      }
    }

    const post = new PostModel({
      content,
      privacy,
      tags,
      author: userId,
    });

    if (attachments) {
      try {
        const paths = await this._s3BucketService.uploadFiles({
          files: attachments,
          path: `Posts/${post._id}`,
        });
        post.attachments = paths as string[];
      } catch (err) {
        throw new InternalServerErrorException("Failed to upload attachments");
      }
    }

    await post.save();

    return post;
  }

  async updatePost(bodyData: IUpdatePostDto, userId: string, postId: string) {
    const {
      tags,
      removedTags,
      content,
      privacy,
      attachments,
      removedAttachments,
    } = bodyData;

    const post = await this._postRepo.findById({ id: postId });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    if (post.author.toString() !== userId) {
      throw new ForbiddenException("You are not allowed to edit this post");
    }

    const hasNoChanges =
      !content &&
      !privacy &&
      !tags?.length &&
      !removedTags?.length &&
      !attachments?.length &&
      !removedAttachments?.length;

    if (hasNoChanges) {
      throw new BadRequestException("Nothing to update");
    }

    if (tags && tags.length > 0) {
      const mentionedUsers = await this._userRepo.find({
        filter: { _id: { $in: tags } },
      });

      if (mentionedUsers.length !== tags.length) {
        throw new BadRequestException("One or more tagged users are invalid");
      }
    }

    let uploadPaths: string[] = [];

    if (attachments && attachments.length > 0) {
      try {
        uploadPaths = (await this._s3BucketService.uploadFiles({
          files: attachments,
          path: `Posts/${post._id}`,
        })) as string[];
      } catch {
        throw new InternalServerErrorException("Failed to upload attachments");
      }
    }

    const removedTagsObjectIds = removedTags
      ? removedTags.map((id) => new Types.ObjectId(id))
      : [];
    const newTagsObjectIds = tags
      ? tags.map((id) => new Types.ObjectId(id))
      : [];

    const updatedPost = await this._postRepo.findOneAndUpdate({
      filter: { _id: postId },
      update: [
        {
          $set: {
            content: content ?? "$content",
            privacy: privacy ?? "$privacy",
            tags: {
              $setUnion: [
                { $setDifference: ["$tags", removedTagsObjectIds] },
                newTagsObjectIds,
              ],
            },
            attachments: {
              $setUnion: [
                { $setDifference: ["$attachments", removedAttachments ?? []] },
                uploadPaths,
              ],
            },
          },
        },
      ],
      options: { updatePipeline: true, returnDocument: "after" },
    });

    if (removedAttachments?.length) {
      const Keys = removedAttachments.map((key) => ({ Key: key }));
      try {
        await this._s3BucketService.deleteFiles(Keys);
      } catch (err) {
        console.error(
          "Failed to delete removed attachments from S3 after retries:",
          err,
        );
      }
    }

    return updatedPost;
  }

  async getPosts(user: HUser, queryData: IGetPostsDto) {
    const queryFilter = queryData.name?.length
      ? { content: { $regex: queryData.name, $options: "i" } }
      : {};

    const posts = await this._postRepo.paginate({
      filter: {
        $or: this._postRepo.checkGetPostsPrivacy(user),
        ...queryFilter,
      },
      page: queryData.page,
      limit: queryData.limit,
      options: {
        populate: [
          {
            path: "comments",
            match: { commentId: { $exists: false } },
            populate: [
              {
                path: "replies",
              },
            ],
          },
        ],
      },
    });

    return posts;
  }

  async likeOrDislikePost(postId: string, user: HUser, react: number | string) {
    const reactionValue = Number(react);
    if (isNaN(reactionValue)) {
      throw new BadRequestException("Invalid reaction value");
    }

    const isDislike = reactionValue === ReactionEnum.Dislike;
    const userId = user._id;

    const update = [
      {
        $set: {
          likes: {
            $concatArrays: [
              {
                $filter: {
                  input: "$likes",
                  cond: { $ne: ["$$this.userId", userId] }, // keep everyone except this user
                },
              },
              isDislike ? [] : [{ userId, reaction: reactionValue }], // add new reaction if not dislike
            ],
          },
        },
      },
    ];

    const updatedPost = await this._postRepo.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: this._postRepo.checkGetPostsPrivacy(user),
        ...(isDislike && { "likes.userId": userId }),
      },
      update,
      options: { updatePipeline: true, returnDocument: "after" },
    });

    if (!updatedPost) {
      throw new NotFoundException(
        isDislike ? "No reaction found to remove" : "Post not found",
      );
    }

    return updatedPost;
  }
}

export default PostService;
