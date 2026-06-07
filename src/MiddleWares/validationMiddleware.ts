import type { NextFunction, Request, Response } from "express";
import z, { ZodType } from "zod";
import { BadRequestException } from "../Common/exceptions/domain.exception.js";

type ReqKey = keyof Request;

export function validation(
  schema: Partial<Record<ReqKey, ZodType>>,
  filesInBody = false,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: Record<string, string> = {};

    for (const key of Object.keys(schema) as ReqKey[]) {
      const zodSchema = schema[key];

      if (!zodSchema) continue;

      if (key === "body" && filesInBody) {
        req.body.attachments = req.files;
      }

      const result = zodSchema.safeParse(req[key]);

      if (!result.success) {
        for (const err of result.error.issues) {
          const path = err.path.join(".");
          validationErrors[path] = err.message;
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      throw new BadRequestException("Validation Failed", { validationErrors });
    }

    next();
  };
}

export const commonValidation = {
  userName: z.string().min(3, "Name must be at least 3 characters long"),
  email: z
    .string()
    .email("Invalid email address")
    // .regex(
    //   /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook)\.(com|net)$/,
    //   "Invalid email address",
    // )
    .toLowerCase(),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character",
    ),
  phone: z
    .string()
    .min(11, "Phone must be at least 11 characters long")
    .regex(/^01[0125][0-9]{8}$/, "Invalid phone number"),
  objectId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId format"),
  OTP: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^[0-9]{6}$/, "Invalid OTP"),
};
