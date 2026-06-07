import { z } from "zod";
import { uploadProfilePicSchema } from "./user.validation.js";

export type IProfilePicDto = z.infer<typeof uploadProfilePicSchema.body>;
