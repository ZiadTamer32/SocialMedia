import type { NextFunction, Request, Response } from "express";
import { NODE_ENV } from "../config/app.config.js";

interface IError extends Error {
  statusCode: number;
}

export function globalErrorHandling(
  err: IError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.status(err.statusCode || 500).json({
    message: err.message,
    ...(NODE_ENV !== "prod" && { stack: err.stack, cause: err.cause }),
  });
}
