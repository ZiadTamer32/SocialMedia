import { z } from "zod";
import {
  createPostSchema,
  getPostsSchema,
  updatePostSchema,
} from "./post.validation.js";

export type ICreatePostDto = z.infer<typeof createPostSchema.body>;

export type IUpdatePostDto = z.infer<typeof updatePostSchema.body>;

export type IGetPostsDto = z.infer<typeof getPostsSchema.query>;
