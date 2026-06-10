import { Response, Router } from "express";
import { authentication } from "../../MiddleWares/authMiddleware.js";
import { IRequest } from "../../Common/interface/index.js";
import { successResponse } from "../../Common/response/response.js";
import chatService from "./chat.service.js";
import multerStorage from "../../MiddleWares/multerMiddleware.js";

const chatController = Router({ mergeParams: true });
const ChatService = new chatService();

chatController.get(
  "/",
  authentication,
  async (req: IRequest, res: Response) => {
    const result = await ChatService.getChat(
      req.params.userId as string,
      req.user!,
    );
    return successResponse({ res, data: result });
  },
);

chatController.get(
  "/group/:groupId",
  authentication,
  async (req: IRequest, res: Response) => {
    const result = await ChatService.getGroup(
      req.params.groupId as string,
      req.user!,
    );
    return successResponse({ res, data: result });
  },
);

chatController.post(
  "/create-group",
  authentication,
  multerStorage({}).single("profileGroup"),
  async (req: IRequest, res: Response) => {
    const result = await ChatService.createGroup(
      req.body.participants as string[],
      req.user!,
      req.body.groupName as string,
      req.file as Express.Multer.File,
    );
    return successResponse({ res, data: result });
  },
);

export default chatController;
