import { z } from "zod";
import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.validation.js";

export type ICreateCommentDto = z.infer<typeof createCommentSchema.body>;
export type IUpdateCommentDto = z.infer<typeof updateCommentSchema.body>;
