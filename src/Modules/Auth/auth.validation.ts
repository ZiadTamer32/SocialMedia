import { z } from "zod";
import { GenderEnum, RoleEnum } from "../../Common/enums/index.js";
import { commonValidation } from "../../MiddleWares/validationMiddleware.js";

export const signupSchema = {
  body: z
    .object({
      userName: commonValidation.userName,
      email: commonValidation.email,
      gender: z.enum(GenderEnum, "Invalid gender"),
      phone: commonValidation.phone,
      DOB: z.date().optional(),
      role: z.enum(RoleEnum, "Invalid role").optional(),
      password: commonValidation.password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};

export const loginSchema = {
  body: z.object({
    email: commonValidation.email,
    password: commonValidation.password,
    FCM: z.string().optional(),
  }),
};

export const resendOTPSchema = {
  body: z.object({
    email: commonValidation.email,
  }),
};
export const forgetPasswordSchema = {
  body: z.object({
    email: commonValidation.email,
  }),
};
export const resetPasswordSchema = {
  body: z.object({
    newPassword: commonValidation.password,
  }),
  params: z.object({
    token: z.string(),
  }),
};

export const confirmOTPSchema = {
  body: z.object({
    otp: commonValidation.OTP,
  }),
  params: z.object({
    userId: commonValidation.objectId,
  }),
};
export const confirmLoginSchema = {
  body: z.object({
    email: commonValidation.email,
    otp: commonValidation.OTP,
  }),
};
