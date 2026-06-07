import z from "zod";
import { commonValidation } from "../../MiddleWares/validationMiddleware.js";

export const updatePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string(),
      newPassword: commonValidation.password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};

export const logoutSchema = {
  body: z.object({
    options: z.enum(["all", "one"], { error: "Invalid Option" }),
  }),
};

export const uploadProfilePicSchema = {
  body: z.object({
    mimeType: z.string(),
    originalName: z.string(),
  }),
};
