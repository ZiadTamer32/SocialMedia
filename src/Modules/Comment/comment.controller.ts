import { Response, Router } from "express";
import commentService from "./comment.service.js";
import { IRequest } from "../../Common/interface/index.js";
import { successResponse } from "../../Common/response/response.js";
import { authentication } from "../../MiddleWares/authMiddleware.js";
import {
  createCommentSchema,
  deleteCommentSchema,
  getCommentSchema,
  replyCommentSchema,
  updateCommentSchema,
} from "./comment.validation.js";
import { validation } from "../../MiddleWares/validationMiddleware.js";
import multerStorage from "../../MiddleWares/multerMiddleware.js";

const commentController = Router();
const CommentService = new commentService();

commentController.post(
  "/:postId",
  authentication,
  multerStorage({ maxSize: 5 }).array("attachments", 5),
  validation(createCommentSchema, true),
  async (req: IRequest, res: Response) => {
    const comment = await CommentService.createComment(
      req.body,
      req.params.postId as string,
      req.user!,
    );
    return successResponse({
      res,
      message: "Comment created successfully",
      data: comment,
    });
  },
);

commentController.post(
  "/:postId/reply/:commentId",
  authentication,
  multerStorage({ maxSize: 5 }).array("attachments", 5),
  validation(replyCommentSchema, true),
  async (req: IRequest, res: Response) => {
    const comment = await CommentService.replyComment(
      req.body,
      req.params.postId as string,
      req.params.commentId as string,
      req.user!,
    );
    return successResponse({
      res,
      message: "Reply created successfully",
      data: comment,
    });
  },
);

commentController.get(
  "/:commentId",
  authentication,
  validation(getCommentSchema),
  async (req: IRequest, res: Response) => {
    const comment = await CommentService.getComment(
      req.params.commentId as string,
      req.user!,
    );
    return successResponse({
      res,
      message: "Comment fetched successfully",
      data: comment,
    });
  },
);

commentController.patch(
  "/:commentId",
  authentication,
  multerStorage({ maxSize: 5 }).array("attachments", 5),
  validation(updateCommentSchema, true),
  async (req: IRequest, res: Response) => {
    const comment = await CommentService.updateComment(
      req.body,
      req.user!._id,
      req.params.commentId as string,
    );
    return successResponse({
      res,
      message: "Comment updated successfully",
      data: comment,
    });
  },
);

commentController.delete(
  "/:commentId",
  authentication,
  validation(deleteCommentSchema),
  async (req: IRequest, res: Response) => {
    await CommentService.deleteComment(
      req.params.commentId as string,
      req.user!._id,
    );
    return successResponse({
      res,
      message: "Comment deleted successfully",
    });
  },
);

export default commentController;
