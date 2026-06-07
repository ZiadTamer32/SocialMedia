import { z } from "zod";
import { signupSchema, loginSchema } from "./auth.validation.js";

export type ISignupDto = z.infer<typeof signupSchema.body>;
export type ILoginDto = z.infer<typeof loginSchema.body>;
