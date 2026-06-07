import UserRepo from "../../DB/repositories/user.repo.js";
import PostRepo from "../../DB/repositories/post.repo.js";
import CommentRepo from "../../DB/repositories/comment.repo.js";
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "../../Common/exceptions/domain.exception.js";
import S3BucketService from "../../Common/S3Bucket/s3bucket.service.js";
import { Types } from "mongoose";
import { CommentModel } from "../../DB/Models/comment.model.js";
import { ICreateCommentDto, IUpdateCommentDto } from "./comment.dto.js";
import { HUser } from "../../DB/Models/user.model.js";

class CommentService {
  private _userRepo = UserRepo;
  private _postRepo = PostRepo;
  private _commentRepo = CommentRepo;
  private _s3BucketService = S3BucketService;

  constructor() {}

  private async validateTags(tags?: string[]): Promise<void> {
    if (!tags?.length) return;
    const mentionedUsers = await this._userRepo.find({
      filter: { _id: { $in: tags } },
    });
    if (mentionedUsers.length !== tags.length) {
      throw new BadRequestException("One or more tagged users are invalid");
    }
  }

  private async uploadAttachments(
    files: Express.Multer.File[],
    s3Path: string,
  ): Promise<string[]> {
    try {
      return (await this._s3BucketService.uploadFiles({
        files,
        path: s3Path,
      })) as string[];
    } catch {
      throw new InternalServerErrorException("Failed to upload attachments");
    }
  }

  async createComment(
    bodyData: ICreateCommentDto,
    postId: string,
    user: HUser,
  ) {
    const { tags, content, attachments } = bodyData;

    const [post] = await Promise.all([
      this._postRepo.findOne({
        filter: {
          _id: postId,
          $or: this._postRepo.checkGetPostsPrivacy(user),
        },
      }),
      this.validateTags(tags),
    ]);

    if (!post) {
      throw new NotFoundException("Post not found or you do not have access");
    }

    const comment = new CommentModel({
      content,
      tags,
      postId,
      author: user._id,
    });

    if (attachments?.length) {
      comment.attachments = await this.uploadAttachments(
        attachments,
        `Posts/${post._id}/Comments/${comment._id}`,
      );
    }

    await comment.save();
    return comment;
  }

  async replyComment(
    bodyData: ICreateCommentDto,
    postId: string,
    commentId: string,
    user: HUser,
  ) {
    const { tags, content, attachments } = bodyData;

    const [comment] = await Promise.all([
      this._commentRepo.findOne({
        filter: { _id: commentId, postId },
        options: {
          populate: [
            {
              path: "postId",
              match: { $or: this._postRepo.checkGetPostsPrivacy(user) },
            },
          ],
        },
      }),
      this.validateTags(tags),
    ]);

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (!comment.postId) {
      throw new ForbiddenException("You do not have access to this post");
    }

    const replyComment = new CommentModel({
      content,
      tags,
      postId,
      commentId,
      author: user._id,
    });

    if (attachments?.length) {
      replyComment.attachments = await this.uploadAttachments(
        attachments,
        `Posts/${postId}/Comments/${commentId}/Replies/${replyComment._id}`,
      );
    }

    await replyComment.save();
    return replyComment;
  }

  async updateComment(
    bodyData: IUpdateCommentDto,
    userId: string | Types.ObjectId,
    commentId: string,
  ) {
    const { tags, removedTags, content, attachments, removedAttachments } =
      bodyData;

    const comment = await this._commentRepo.findById({ id: commentId });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (comment.author.toString() !== userId.toString()) {
      throw new ForbiddenException("You are not allowed to edit this comment");
    }

    const hasNoChanges =
      !content &&
      !tags?.length &&
      !removedTags?.length &&
      !attachments?.length &&
      !removedAttachments?.length;

    if (hasNoChanges) {
      throw new BadRequestException("Nothing to update");
    }

    await this.validateTags(tags);

    let uploadPaths: string[] = [];
    if (attachments?.length) {
      uploadPaths = await this.uploadAttachments(
        attachments,
        `Posts/${comment.postId}/Comments/${comment._id}`,
      );
    }

    if (removedAttachments?.length) {
      const commentAttachments = comment.attachments ?? [];
      const invalidKeys = removedAttachments.filter(
        (key: string) => !commentAttachments.includes(key),
      );
      if (invalidKeys.length > 0) {
        throw new BadRequestException(
          "Some attachment keys do not belong to this comment",
        );
      }
    }

    const removedTagsObjectIds = removedTags
      ? removedTags.map((id: string) => new Types.ObjectId(id))
      : [];
    const newTagsObjectIds = tags
      ? tags.map((id: string) => new Types.ObjectId(id))
      : [];

    const updatedComment = await this._commentRepo.findOneAndUpdate({
      filter: { _id: commentId },
      update: [
        {
          $set: {
            content: content ?? "$content",
            tags: {
              $setUnion: [
                { $setDifference: ["$tags", removedTagsObjectIds] },
                newTagsObjectIds,
              ],
            },
            attachments: {
              $setUnion: [
                {
                  $setDifference: ["$attachments", removedAttachments ?? []],
                },
                uploadPaths,
              ],
            },
          },
        },
      ],
      options: { updatePipeline: true, returnDocument: "after" },
    });

    if (removedAttachments?.length) {
      const Keys = removedAttachments.map((key: string) => ({ Key: key }));
      try {
        await this._s3BucketService.deleteFiles(Keys);
      } catch (err) {
        console.error(
          "Failed to delete removed attachments from S3 after retries:",
          err,
        );
      }
    }

    return updatedComment;
  }

  async getComment(commentId: string, user: HUser) {
    const comment = await this._commentRepo.findOne({
      filter: { _id: commentId },
      options: {
        populate: [
          {
            path: "postId",
            match: { $or: this._postRepo.checkGetPostsPrivacy(user) },
          },
          { path: "replies" },
        ],
      },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (!comment.postId) {
      throw new ForbiddenException("You do not have access to this post");
    }

    return comment;
  }

  async deleteComment(commentId: string, userId: string | Types.ObjectId) {
    const comment = await this._commentRepo.findById({ id: commentId });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (comment.author.toString() !== userId.toString()) {
      throw new ForbiddenException(
        "You are not allowed to delete this comment",
      );
    }

    // Soft-delete
    comment.isSoftDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();
  }
}

export default CommentService;
