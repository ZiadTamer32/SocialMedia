import z from "zod";
import { PostPrivacyEnum } from "../../Common/enums/index.js";
import { commonValidation } from "../../MiddleWares/validationMiddleware.js";

export const createPostSchema = {
  body: z
    .object({
      author: commonValidation.objectId,
      content: z
        .string()
        .min(1, "Content must be at least 1 character long")
        .max(2000, "Content must be at most 2000 characters long")
        .optional(),
      attachments: z.array(z.any()).optional(),
      likes: z.array(commonValidation.objectId).optional(),
      tags: z.array(commonValidation.objectId).optional(),
      privacy: z.nativeEnum(PostPrivacyEnum).default(PostPrivacyEnum.Public),
    })
    .superRefine((args, ctx) => {
      if (!args.content && !args.attachments?.length) {
        ctx.addIssue({
          code: "custom",
          message: "Content or attachments are required",
          path: ["content"],
        });
      }
      if (args.tags) {
        const uniqueTags = [...new Set(args.tags)];
        if (uniqueTags.length !== args.tags?.length) {
          ctx.addIssue({
            code: "custom",
            message: "Tags must be unique",
            path: ["tags"],
          });
        }

        if (args.author && args.tags.includes(args.author)) {
          ctx.addIssue({
            code: "custom",
            message: "Author cannot tag themselves",
            path: ["tags"],
          });
        }
      }
    }),
};

export const updatePostSchema = {
  body: z
    .object({
      author: commonValidation.objectId,
      content: z
        .string()
        .min(1, "Content must be at least 1 character long")
        .max(2000, "Content must be at most 2000 characters long")
        .optional(),
      attachments: z.array(z.any()).optional(),
      tags: z.array(commonValidation.objectId).optional(),
      removedTags: z.array(commonValidation.objectId).optional(),
      removedAttachments: z.array(z.string()).optional(),
      privacy: z.nativeEnum(PostPrivacyEnum).optional(),
    })
    .superRefine((args, ctx) => {
      if (args.tags) {
        const uniqueTags = [...new Set(args.tags)];
        if (uniqueTags.length !== args.tags?.length) {
          ctx.addIssue({
            code: "custom",
            message: "Tags must be unique",
            path: ["tags"],
          });
        }

        if (args.author && args.tags.includes(args.author)) {
          ctx.addIssue({
            code: "custom",
            message: "Author cannot tag themselves",
            path: ["tags"],
          });
        }
      }
    }),
  params: z.object({ postId: commonValidation.objectId }),
};

export const getPostsSchema = {
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    name: z.string().optional(),
  }),
};
export const likePostSchema = {
  query: z.object({
    react: z.coerce
      .number()
      .min(0, {
        message: "Invalid reaction",
      })
      .max(6, {
        message: "Invalid reaction",
      }),
  }),
  params: z.object({ postId: commonValidation.objectId }),
};
