import express from "express";
import cors from "cors";
import s3bucketService from "./Common/S3Bucket/s3bucket.service.js";
import authController from "./Modules/Auth/auth.controller.js";
import testDbConnection from "./DB/connection.js";
import userController from "./Modules/User/user.controller.js";
import { globalErrorHandling } from "./MiddleWares/errorMiddleware.js";
import { PORT } from "./config/app.config.js";
import { testRedisConnection } from "./DB/redis.connection.js";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import { successResponse } from "./Common/response/response.js";
import postController from "./Modules/Post/post.controller.js";
import commentController from "./Modules/Comment/comment.controller.js";

async function bootstrap() {
  const app: express.Express = express();

  await testDbConnection();
  await testRedisConnection();

  app.use(express.json());
  app.use(cors());

  app.get("/uploads/*path", async (req, res, next) => {
    const key = req.params.path.join("/");

    const result = await s3bucketService.getFile(key);

    // promisify to use await in pipline instead of .then() / Pipline to read a response buffer
    const promisePipline = promisify(pipeline);

    await promisePipline(result.Body as NodeJS.ReadableStream, res);
  });

  app.get("/pre-signed/uploads/*path", async (req, res, next) => {
    const key = req.params.path.join("/") as string;

    const { url } = await s3bucketService.createPreSignUrlGetFile(key);

    return successResponse({ res, data: url });
  });

  app.use("/auth", authController);
  app.use("/user", userController);
  app.use("/post", postController);
  app.use("/comment", commentController);

  app.use(
    "/*d",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ): void => {
      res.status(404).json("Invalid URL or METHOD");
    },
  );

  app.use(globalErrorHandling);

  app.listen(PORT, () => {
    console.log(`App Running on port ${PORT}`);
  });
}

export default bootstrap;
