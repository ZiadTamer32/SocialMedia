import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import authService from "../Auth/auth.service.js";
import { successResponse } from "../../Common/response/response.js";
import { validation } from "../../MiddleWares/validationMiddleware.js";
import {
  signupSchema,
  loginSchema,
  resendOTPSchema,
  confirmOTPSchema,
  confirmLoginSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
} from "../Auth/auth.validation.js";
import type {
  IUser,
  ILoginResponse,
  ISocialLogin,
} from "../../Common/interface/index.js";

const authController = Router();
const AuthService = new authService();

authController.post(
  "/signup",
  validation(signupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await AuthService.signup(req.body);
    return successResponse<IUser>({ res, statusCode: 201, data: result });
  },
);

authController.post(
  "/login",
  validation(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await AuthService.login(req.body);
    return successResponse<ILoginResponse | string>({
      res,
      data: result,
    });
  },
);

authController.post(
  "/resendOTP",
  validation(resendOTPSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    await AuthService.resendOTP(req.body.email);
    return successResponse<{ message: string }>({
      res,
      message: "OTP sent successfully",
    });
  },
);

authController.post(
  "/confirmLogin",
  validation(confirmLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await AuthService.confirmLogin(req.body);
    return successResponse<ILoginResponse>({
      res,
      data: result,
    });
  },
);

authController.post(
  "/forgetPassword",
  validation(forgetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await AuthService.forgetPassword(req.body.email);
    return successResponse<string>({
      res,
      message: result,
    });
  },
);
authController.post(
  "/resetPassword",
  validation(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await AuthService.resetPassword(
      req.body.newPassword,
      req.params.token as string,
    );
    return successResponse<string>({
      res,
      message: result,
    });
  },
);

authController.post(
  "/signup/gmail",
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await AuthService.gmailAuth(req.body.idToken);
    return successResponse<ISocialLogin>({
      res,
      statusCode: result.statusCode,
      data: result,
    });
  },
);

authController.post(
  "/confirmEmail/:userId",
  validation(confirmOTPSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    await AuthService.confirmVerifyEmail(req.body, req.params.userId as string);
    return successResponse<{ message: string }>({
      res,
      message: "Account verified successfully",
    });
  },
);

export default authController;
