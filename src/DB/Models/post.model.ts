import mongoose, { HydratedDocument } from "mongoose";
import { IPost } from "../../Common/interface/index.js";
import { Types } from "mongoose";
import { PostPrivacyEnum, ReactionEnum } from "../../Common/enums/index.js";

export type HPost = HydratedDocument<IPost>;

const postSchema = new mongoose.Schema<IPost>(
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
    tags: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    likes: [
      {
        userId: {
          type: Types.ObjectId,
          ref: "User",
        },
        reaction: {
          type: Number,
          enum: ReactionEnum,
        },
      },
    ],
    privacy: {
      type: Number,
      enum: PostPrivacyEnum,
      default: PostPrivacyEnum.Public,
    },
    isSoftDeleted: Boolean,
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();
  if (!query.isSoftDeleted) {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "postId",
});

export const PostModel = mongoose.model<IPost>("Post", postSchema);
