import jwt, { JwtPayload } from "jsonwebtoken";
import { IRequest } from "../Common/interface/index.js";
import type { NextFunction, Response } from "express";
import {
  ForbiddenException,
  UnauthorizedException,
} from "../Common/exceptions/domain.exception.js";
import { RoleEnum, TokenEnum } from "../Common/enums/index.js";
import { ROLE_SECRETS } from "../Common/constants.js";
import userRepo from "../DB/repositories/user.repo.js";
import redisMethods from "../DB/repositories/redis.repo.js";

export const authentication = async (
  req: IRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedException("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  const unverified = jwt.decode(token);

  if (!unverified || typeof unverified === "string" || !unverified.aud) {
    throw new UnauthorizedException("Invalid token structure");
  }

  const [role, tokenType] = unverified.aud as [RoleEnum, string];

  const isRefreshUrl = req.path === "/renew-token";

  if (!isRefreshUrl && tokenType !== TokenEnum.Access) {
    throw new UnauthorizedException("Invalid token structure");
  }

  if (isRefreshUrl && tokenType !== TokenEnum.Refresh) {
    throw new UnauthorizedException("Invalid token structure");
  }

  const secret = isRefreshUrl
    ? ROLE_SECRETS[role]?.[1]
    : ROLE_SECRETS[role]?.[0];

  if (!secret) {
    throw new UnauthorizedException("Unknown token role");
  }

  let verified: JwtPayload;
  try {
    verified = jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw new UnauthorizedException("Invalid or expired token");
  }

  const isTokenExist = await redisMethods.exists(
    `blackListToken::${verified.id}::${verified.jti}`,
  );

  if (isTokenExist) {
    throw new UnauthorizedException(
      "Token has been revoked. Please log in again",
    );
  }

  const isUserExist = await userRepo.findById({
    id: verified.id,
  });

  if (!isUserExist) {
    throw new UnauthorizedException("User not found");
  }

  if (
    isUserExist.changeCreditTime &&
    verified.iat &&
    isUserExist.changeCreditTime.getTime() > verified.iat * 1000
  ) {
    throw new UnauthorizedException(
      "Token expired due to logout from all devices",
    );
  }

  req.tokenData = verified;
  req.user = isUserExist;
  next();
};

export const authorization = (...roles: RoleEnum[]) => {
  return (req: IRequest, res: Response, next: NextFunction) => {
    const [userRole] = req.tokenData!.aud as [RoleEnum, TokenEnum];
    if (!roles.includes(userRole)) {
      throw new ForbiddenException("You don't have access to this endpoint");
    }
    next();
  };
};

// verified: {
//  id: '69ea2d2fe9528b18ccc3edd6',
//  iat: 1776954689,
//  id: '69ea2d2fe9528b18ccc3edd6',
//  iat: 1776954689,
//  iat: 1776954689,
//  exp: 1776955589,
//  aud: [ 'user', 'access' ],
//  jti: '2c1dea46-9f36-4219-a32c-4e0250a12e48'
//}
