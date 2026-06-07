class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export default AppError;
