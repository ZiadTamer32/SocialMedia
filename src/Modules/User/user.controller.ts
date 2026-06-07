import { Router } from "express";
import type { NextFunction, Response } from "express";
import { authentication } from "../../MiddleWares/authMiddleware.js";
import userService from "./user.service.js";
import { successResponse } from "../../Common/response/response.js";
import { IRequest, IUser } from "../../Common/interface/index.js";
import { validation } from "../../MiddleWares/validationMiddleware.js";
import { logoutSchema, updatePasswordSchema } from "./user.validation.js";
import multerStorage from "../../MiddleWares/multerMiddleware.js";
import { MulterStorageEnum } from "../../Common/enums/index.js";

const userController = Router();
const UserService = new userService();

userController.get(
  "/",
  authentication,
  async (req: IRequest, res: Response, next: NextFunction) => {
    const result = await UserService.getUser(req.user!._id);
    return successResponse<IUser>({ res, data: result });
  },
);

userController.post(
  "/logout",
  authentication,
  validation(logoutSchema),
  async (req: IRequest, res: Response, next: NextFunction) => {
    await UserService.logout(req.tokenData!, req.body.options);
    return successResponse<{ message: string }>({
      res,
      message: "Logout success",
    });
  },
);

userController.patch(
  "/enableTwoStepVerification",
  authentication,
  async (req: IRequest, res: Response, next: NextFunction) => {
    await UserService.enableTwoStepVerification(req.user!);
    return successResponse<{ message: string }>({
      res,
      message: "2-step-verification enabled successfully",
    });
  },
);

userController.patch(
  "/disableTwoStepVerification",
  authentication,
  async (req: IRequest, res: Response, next: NextFunction) => {
    await UserService.disableTwoStepVerification(req.user!);
    return successResponse<{ message: string }>({
      res,
      message: "2-step-verification disabled successfully",
    });
  },
);

userController.patch(
  "/updatePassword",
  authentication,
  validation(updatePasswordSchema),
  async (req: IRequest, res: Response, next: NextFunction) => {
    await UserService.updatePassword(req.user!, req.body);
    return successResponse<{ message: string }>({
      res,
      message: "Password updated successfully",
    });
  },
);

userController.post(
  "/uploadCoverPics",
  authentication,
  multerStorage({
    storageType: MulterStorageEnum.Memory,
  }).array("coverPics", 3),
  async (req: IRequest, res: Response, next: NextFunction) => {
    const coverPics = await UserService.uploadCoverPics(
      req.user!.id,
      req.files as Express.Multer.File[],
    );
    return successResponse<string[]>({
      res,
      message: "Cover Pics Uploaded Successfully",
      data: coverPics as string[],
    });
  },
);

userController.post(
  "/uploadProfilePic",
  authentication,
  multerStorage({
    storageType: MulterStorageEnum.Memory,
  }).single("profilePic"),
  async (req: IRequest, res: Response, next: NextFunction) => {
    const profilePic = await UserService.uploadProfilePic(
      req.user!.id,
      req.body,
    );
    return successResponse<{ key: string; url: string }>({
      res,
      message: "Profile Pic Uploaded Successfully",
      data: profilePic,
    });
  },
);

userController.delete(
  "/",
  authentication,
  async (req: IRequest, res: Response, next: NextFunction) => {
    const result = await UserService.deleteUser(req.user!);
    return successResponse({
      res,
      message: "User Deleted Successfully",
      data: result,
    });
  },
);

export default userController;
