import AppError from "./AppError.js";

export class BadRequestException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 400, cause);
  }
}

export class NotFoundException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 404, cause);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 401, cause);
  }
}

export class ForbiddenException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 403, cause);
  }
}

export class ConflictException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 409, cause);
  }
}
export class TooManyRequestsException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 429, cause);
  }
}

export class InternalServerErrorException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 500, cause);
  }
}
