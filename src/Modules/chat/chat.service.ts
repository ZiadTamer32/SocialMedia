import { Types } from "mongoose";
import { HUser } from "../../DB/Models/user.model.js";
import chatRepo from "../../DB/repositories/chat.repo.js";
import { NotFoundException } from "../../Common/exceptions/domain.exception.js";
import { ChatTypeEnum } from "../../Common/enums/index.js";
import { randomUUID } from "node:crypto";
import s3bucketService from "../../Common/S3Bucket/s3bucket.service.js";
import userRepo from "../../DB/repositories/user.repo.js";

class ChatService {
  private _userRepo: typeof userRepo;
  private _chatRepo: typeof chatRepo;
  private _s3BucketService: typeof s3bucketService;

  constructor() {
    this._userRepo = userRepo;
    this._chatRepo = chatRepo;
    this._s3BucketService = s3bucketService;
  }

  async getChat(participantId: string, user: HUser) {
    const chat = await this._chatRepo.findOne({
      filter: {
        participants: {
          $all: [Types.ObjectId.createFromHexString(participantId), user._id],
        },
        chatType: ChatTypeEnum.OVO,
      },
      options: {
        populate: "participants",
      },
    });

    if (!chat) {
      throw new NotFoundException("Chat not found");
    }

    return { chat };
  }

  async getGroup(groupId: string, user: HUser) {
    const group = await this._chatRepo.findOne({
      filter: {
        _id: groupId,
        participants: {
          $in: [user._id],
        },
        chatType: ChatTypeEnum.OVM,
      },
      options: {
        populate: "participants messages.author",
      },
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    return { group };
  }

  async sendMessage(bodyData: any, user: HUser) {
    const { content, sendTo } = bodyData;
    const chat = await this._chatRepo.findOneAndUpdate({
      filter: {
        participants: {
          $all: [Types.ObjectId.createFromHexString(sendTo), user._id],
        },
        chatType: ChatTypeEnum.OVO,
      },
      update: {
        $push: {
          messages: {
            content,
            author: user._id,
          },
        },
      },
      options: {
        returnDocument: "after",
      },
    });
    if (!chat) {
      const newChat = await this._chatRepo.create({
        participants: [Types.ObjectId.createFromHexString(sendTo), user._id],
        chatType: ChatTypeEnum.OVO,
        messages: [
          {
            content,
            author: user._id,
          },
        ],
        author: user._id,
      });
      return newChat;
    }
    return chat;
  }

  async sendGroupMessage(bodyData: any, user: HUser) {
    const { content, groupId } = bodyData;
    const group = await this._chatRepo.findOneAndUpdate({
      filter: {
        _id: Types.ObjectId.createFromHexString(groupId),
        participants: {
          $in: [user._id],
        },
        chatType: ChatTypeEnum.OVM,
      },
      update: {
        $push: {
          messages: {
            content,
            author: user._id,
          },
        },
      },
      options: {
        returnDocument: "after",
      },
    });
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    return group;
  }

  async createGroup(
    participants: string[],
    user: HUser,
    groupName: string,
    file: Express.Multer.File,
  ) {
    const participantsIds = participants.map((p) =>
      Types.ObjectId.createFromHexString(p),
    );

    const users = await this._userRepo.find({
      filter: {
        _id: {
          $in: participantsIds,
          $ne: user._id,
        },
      },
    });

    if (users.length !== participants.length) {
      throw new NotFoundException("Some Users Not Found");
    }

    const roomId = randomUUID();

    let profileGroup: string = "";

    if (file) {
      profileGroup = await this._s3BucketService.uploadFile({
        file,
        path: `chat/group/${roomId}`,
      });
    }

    const group = await this._chatRepo.create({
      author: user._id,
      participants: [user._id, ...participantsIds],
      chatType: ChatTypeEnum.OVM,
      messages: [
        {
          content: `${user.userName} created a group`,
          author: user._id,
        },
      ],
      roomId,
      group_name: groupName,
      group_image: profileGroup,
    });

    return group;
  }
}

export default ChatService;
