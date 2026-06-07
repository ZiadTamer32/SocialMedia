import mongoose, { HydratedDocument } from "mongoose";
import { IComment } from "../../Common/interface/index.js";
import { Types } from "mongoose";
import { ReactionEnum } from "../../Common/enums/index.js";

export type HComment = HydratedDocument<IComment>;

const commentSchema = new mongoose.Schema<IComment>(
  {
    postId: {
      type: Types.ObjectId,
      ref: "Post",
      required: true,
    },
    commentId: {
      type: Types.ObjectId,
      ref: "Comment",
    },
    author: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: [String],
    content: {
      type: String,
      required: function (): boolean {
        return !this.attachments?.length;
      },
    },

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

    isSoftDeleted: Boolean,
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

commentSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();
  if (!query.isSoftDeleted) {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "commentId",
});

export const CommentModel = mongoose.model<IComment>("Comment", commentSchema);
