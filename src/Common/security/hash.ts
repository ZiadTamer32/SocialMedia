import { hash, compare } from "bcrypt";
import { SALT_ROUND } from "../../config/app.config.js";

export const hashOperation = async ({
  plainText,
  rounds = SALT_ROUND,
}: {
  plainText: string;
  rounds?: number;
}) => {
  return await hash(String(plainText), rounds);
};

export const compareOperation = async ({
  plainText,
  hashedValue,
}: {
  plainText: string;
  hashedValue: string;
}) => {
  return await compare(String(plainText), hashedValue);
};
