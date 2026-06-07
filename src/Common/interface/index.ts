import { JwtPayload } from "jsonwebtoken";
import {
  GenderEnum,
  PostPrivacyEnum,
  ProviderEnum,
  ReactionEnum,
  RoleEnum,
} from "../enums/index.js";
import { Request } from "express";
import { Types } from "mongoose";
import { HUser } from "../../DB/Models/user.model.js";

export interface IUser {
  userName: string;
  email: string;
  password?: string;
  phone?: string;
  gender?: GenderEnum;
  role?: RoleEnum;
  isVerified?: boolean;
  provider?: ProviderEnum;
  visitCount?: number;
  profilePic?: string;
  coverPics?: [string];
  gallery?: [string];
  DOB?: Date;
  changeCreditTime?: Date;
  twoStepVerification?: boolean;
  friends?: Types.ObjectId[];
  deletedAt?: Date;
  isSoftDeleted?: boolean;
}

export interface IPost {
  author: Types.ObjectId;
  privacy: PostPrivacyEnum;
  likes: {
    userId: Types.ObjectId;
    reaction: ReactionEnum;
  }[];
  content?: string;
  attachments?: string[];
  tags?: Types.ObjectId[];
  deletedAt?: Date;
  isSoftDeleted?: boolean;
}
export interface IComment {
  postId: Types.ObjectId;
  commentId: Types.ObjectId;
  author: Types.ObjectId;
  tags?: Types.ObjectId[];
  likes: {
    userId: Types.ObjectId;
    reaction: ReactionEnum;
  }[];
  content?: string;
  attachments?: string[];
  deletedAt?: Date;
  isSoftDeleted?: boolean;
}

export interface IRequest extends Request {
  user?: HUser;
  tokenData?: JwtPayload;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ISocialLogin {
  statusCode: number;
  user: IUser;
  accessToken: string;
  refreshToken: string;
}
