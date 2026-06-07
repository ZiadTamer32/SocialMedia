import { NextFunction, Response, Router } from "express";
import postService from "./post.service.js";
import multerStorage from "../../MiddleWares/multerMiddleware.js";
import { validation } from "../../MiddleWares/validationMiddleware.js";
import {
  createPostSchema,
  getPostsSchema,
  likePostSchema,
  updatePostSchema,
} from "./post.validation.js";
import { IRequest } from "../../Common/interface/index.js";
import { authentication } from "../../MiddleWares/authMiddleware.js";
import { successResponse } from "../../Common/response/response.js";

const postController = Router();
const PostService = new postService();

postController.post(
  "/",
  authentication,
  multerStorage({ maxSize: 5 }).array("attachments", 5),
  validation(createPostSchema, true),
  async (req: IRequest, res: Response, next: NextFunction) => {
    const post = await PostService.createPost(req.body, req.user!._id as any);
    return successResponse({
      res,
      message: "Post created successfully",
      data: post,
    });
  },
);

postController.get(
  "/",
  authentication,
  validation(getPostsSchema),
  async (req: IRequest, res: Response, next: NextFunction) => {
    const posts = await PostService.getPosts(req.user!, req.query);
    return successResponse({
      res,
      message: "Posts fetched successfully",
      data: posts,
    });
  },
);

postController.patch(
  "/react-post/:postId",
  authentication,
  validation(likePostSchema),
  async (req: IRequest, res: Response, next: NextFunction) => {
    const post = await PostService.likeOrDislikePost(
      req.params.postId as string,
      req.user!,
      req.query.react as string,
    );
    return successResponse({
      res,
      message: "Post updated successfully",
      data: post,
    });
  },
);

postController.patch(
  "update-post/:postId",
  authentication,
  multerStorage({ maxSize: 5 }).array("attachments", 5),
  validation(updatePostSchema, true),
  async (req: IRequest, res: Response, next: NextFunction) => {
    const post = await PostService.updatePost(
      req.body,
      req.user!._id as any,
      req.params.postId as string,
    );
    return successResponse({
      res,
      message: "Post updated successfully",
      data: post,
    });
  },
);

export default postController;
