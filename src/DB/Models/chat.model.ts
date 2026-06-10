import mongoose, { HydratedDocument } from "mongoose";
import { IChat, IMessage } from "../../Common/interface/index.js";
import { Types } from "mongoose";
import { ChatTypeEnum } from "../../Common/enums/index.js";

export type HMessage = HydratedDocument<IMessage>;

const messageSchema = new mongoose.Schema<IMessage>(
  {
    author: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: function (): boolean {
        return !this.attachments?.length;
      },
    },
    attachments: [String],
    isSoftDeleted: Boolean,
    deletedAt: Date,
  },
  {
    timestamps: true,
  },
);

export type HChat = HydratedDocument<IChat>;

const chatSchema = new mongoose.Schema<IChat>(
  {
    participants: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    messages: [messageSchema],
    chatType: {
      type: String,
      enum: ChatTypeEnum,
      default: ChatTypeEnum.OVO,
    },
    group_name: {
      type: String,
      required: function (): boolean {
        return this.chatType === ChatTypeEnum.OVM;
      },
    },
    group_image: {
      type: String,
      required: function (): boolean {
        return this.chatType === ChatTypeEnum.OVM;
      },
    },
    roomId: {
      type: String,
      required: function (): boolean {
        return this.chatType === ChatTypeEnum.OVM;
      },
    },
    isSoftDeleted: Boolean,
    deletedAt: Date,
  },
  {
    timestamps: true,
  },
);

chatSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();
  if (!query.isSoftDeleted) {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

export const ChatModel = mongoose.model<IChat>("Chat", chatSchema);
