import { randomInt } from "node:crypto";

export const generateOTP = () => randomInt(100000, 1000000).toString();
