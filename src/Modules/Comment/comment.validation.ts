import z from "zod";
import { commonValidation } from "../../MiddleWares/validationMiddleware.js";

const tagRefinement = (args: { tags?: string[] }, ctx: z.RefinementCtx) => {
  if (!args.tags) return;

  const uniqueTags = [...new Set(args.tags)];
  if (uniqueTags.length !== args.tags.length) {
    ctx.addIssue({
      code: "custom",
      message: "Tags must be unique",
      path: ["tags"],
    });
  }
};

export const createCommentSchema = {
  body: z
    .object({
      content: z
        .string()
        .min(1, "Content must be at least 1 character long")
        .max(2000, "Content must be at most 2000 characters long")
        .optional(),
      attachments: z.array(z.any()).optional(),
      tags: z.array(commonValidation.objectId).optional(),
    })
    .superRefine((args, ctx) => {
      if (!args.content && !args.attachments?.length) {
        ctx.addIssue({
          code: "custom",
          message: "Content or attachments are required",
          path: ["content"],
        });
      }
      tagRefinement(args, ctx);
    }),
  params: z.object({
    postId: commonValidation.objectId,
  }),
};

export const replyCommentSchema = {
  body: createCommentSchema.body,
  params: z.object({
    postId: commonValidation.objectId,
    commentId: commonValidation.objectId,
  }),
};

export const getCommentSchema = {
  params: z.object({
    commentId: commonValidation.objectId,
  }),
};

export const updateCommentSchema = {
  body: z
    .object({
      content: z
        .string()
        .min(1, "Content must be at least 1 character long")
        .max(2000, "Content must be at most 2000 characters long")
        .optional(),
      attachments: z.array(z.any()).optional(),
      tags: z.array(commonValidation.objectId).optional(),
      removedTags: z.array(commonValidation.objectId).optional(),
      removedAttachments: z.array(z.string()).optional(),
    })
    .superRefine(tagRefinement),
  params: z.object({
    commentId: commonValidation.objectId,
  }),
};

export const deleteCommentSchema = {
  params: z.object({
    commentId: commonValidation.objectId,
  }),
};
