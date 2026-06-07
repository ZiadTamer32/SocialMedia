import type { Response } from "express";

export function successResponse<T>({
  res,
  statusCode = 200,
  message = "Done",
  data,
}: {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
}) {
  res.status(statusCode).json({ message, data });
}
