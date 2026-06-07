import jwt, { JwtPayload } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { QueryFilter, Types } from "mongoose";
import type { ISignupDto, ILoginDto } from "./auth.dto.js";
import UserRepo from "../../DB/repositories/user.repo.js";
import RedisRepo from "../../DB/repositories/redis.repo.js";
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
} from "../../Common/exceptions/domain.exception.js";
import type {
  ILoginResponse,
  ISocialLogin,
  IUser,
} from "../../Common/interface/index.js";
import { compareOperation, hashOperation } from "../../Common/security/hash.js";
import {
  JWT_EXPIRES_IN,
  JWT_SECRET_USER,
  WEB_CLIENT_ID,
} from "../../config/app.config.js";
import { ProviderEnum, RoleEnum, TokenEnum } from "../../Common/enums/index.js";
import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  ROLE_SECRETS,
  VERIFICATION_EMAIL_TEMPLATE,
} from "../../Common/constants.js";
import { HUser } from "../../DB/Models/user.model.js";
import sendOTP from "../../Common/mails/sendOTP.js";
import attempts from "../../Common/security/attempts.js";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import sendEmail from "../../Common/mails/sendEmail.js";
import firebaseService from "../../Common/FireBase/firebase.service.js";

class AuthService {
  private userRepo: typeof UserRepo;
  private redisMethods: typeof RedisRepo;
  private _firbaseService: typeof firebaseService;
  constructor() {
    this.userRepo = UserRepo;
    this.redisMethods = RedisRepo;
    this._firbaseService = firebaseService;
  }

  generateTokens = (user: HUser): ILoginResponse => {
    const secrets = ROLE_SECRETS[user.role as RoleEnum];

    if (!secrets) {
      throw new InternalServerErrorException("Invalid role configuration");
    }

    const [accessSign, refreshSign] = secrets;

    const tokenId = randomUUID();

    const accessToken = jwt.sign({ id: user._id }, accessSign, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      audience: [user.role as RoleEnum, TokenEnum.Access],
      jwtid: tokenId,
    });

    const refreshToken = jwt.sign({ id: user._id }, refreshSign, {
      expiresIn: "1y",
      audience: [user.role as RoleEnum, TokenEnum.Refresh],
      jwtid: tokenId,
    });

    return {
      accessToken,
      refreshToken,
    };
  };

  signup = async (bodyData: ISignupDto): Promise<IUser> => {
    const { email } = bodyData;
    const isEmailExist = await this.userRepo.findOne({ filter: { email } });

    if (isEmailExist) {
      throw new ConflictException("Email already exists");
    }

    const user = await this.userRepo.create(bodyData);

    return user;
  };

  login = async (bodyData: ILoginDto): Promise<ILoginResponse | string> => {
    const { email, password } = bodyData;

    const isBlocked = await this.redisMethods.getString(
      `BLOCK::${email}::login`,
    );
    if (isBlocked) {
      throw new TooManyRequestsException(
        `Too many attempts. Please try again in 5 minutes.`,
      );
    }

    const user = await this.userRepo.findOne({
      filter: { email },
    });

    if (!user) {
      // Block after 5 attempts --> 5 min
      await attempts({
        email,
        expireAt: 60 * 5,
        numOfAttempts: 5,
        type: "login",
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    const isMatchPassword = await compareOperation({
      plainText: password,
      hashedValue: user.password!,
    });

    if (!isMatchPassword) {
      await attempts({
        email: user.email,
        expireAt: 60 * 5,
        numOfAttempts: 5,
        type: "login",
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.redisMethods.del(`ATTEMPT::${user.email}::login`);

    if (!user.isVerified) {
      throw new UnauthorizedException("Please verify your email first");
    }

    if (user.twoStepVerification) {
      await sendOTP({
        email: user.email,
        subject: "Login-2-step-verification",
        template: VERIFICATION_EMAIL_TEMPLATE,
      });
      return "OTP sent to your email. Please verify to complete login.";
    }

    const { accessToken, refreshToken } = this.generateTokens(user as HUser);

    if (bodyData.FCM) {
      await this.redisMethods.addToSet(`FCMToken::${user._id}`, bodyData.FCM);
      await this._firbaseService.sendNotification({
        token: bodyData.FCM,
        title: "Login",
        body: "You logged in successfully",
      });
    }

    return { accessToken, refreshToken };
  };

  confirmOTP = async (
    bodyData: { otp: string } | { email: string },
    filters: QueryFilter<HUser>,
    type: string,
  ): Promise<void> => {
    const { otp } = bodyData as { otp: string };

    const user = await this.userRepo.findOne({ filter: filters });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isVerified && type === "Verify_your_email") {
      throw new BadRequestException("Account already verified");
    }

    const OTPKey = `OTP::${user.email}::${type}`;
    const storedOTP = await this.redisMethods.getString(OTPKey);

    if (!storedOTP) {
      throw new UnauthorizedException("OTP expired");
    }

    const isMatch = await compareOperation({
      plainText: otp,
      hashedValue: storedOTP,
    });

    if (!isMatch) {
      throw new UnauthorizedException("Invalid OTP");
    }

    // Success
    if (type === "Verify_your_email") {
      user.isVerified = true;
      await user.save();
    }

    await this.redisMethods.del(OTPKey);
  };

  confirmVerifyEmail = async (
    bodyData: { otp: string },
    userId: string | Types.ObjectId,
  ): Promise<void> => {
    return this.confirmOTP(bodyData, { _id: userId }, "Verify_your_email");
  };

  resendOTP = async (email: string): Promise<void> => {
    const user = await this.userRepo.findOne({
      filter: { email },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isVerified) {
      throw new BadRequestException("Account already verified");
    }

    const OTPKey = `OTP::${user.email}::Verify_your_email`;
    const storedOTP = await this.redisMethods.getString(OTPKey);

    if (storedOTP) {
      throw new BadRequestException(
        "OTP already sent, check your email, you can resend it after 5 minutes",
      );
    }

    // Block after 3 attempts --> 5 min
    await attempts({
      email: user.email,
      expireAt: 60 * 5,
      numOfAttempts: 3,
      type: "Verify_your_email",
    });

    // Send OTP after passing all checks
    await sendOTP({
      email,
      subject: "Verify your email",
      template: VERIFICATION_EMAIL_TEMPLATE,
    });
  };

  confirmLogin = async (bodyData: {
    email: string;
    otp: string;
  }): Promise<ILoginResponse> => {
    const { email } = bodyData;

    await this.confirmOTP(bodyData, { email }, "Login-2-step-verification");

    const user = await this.userRepo.findOne({
      filter: { email },
    });

    const { accessToken, refreshToken } = this.generateTokens(user as HUser);

    return {
      accessToken,
      refreshToken,
    };
  };

  verifyTokenGmail = async (idToken: string) => {
    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload() as TokenPayload;

    return payload;
  };

  getOrCreateGmailUser = async (resultPayload: TokenPayload) => {
    const user = await this.userRepo.findOne({
      filter: { email: resultPayload.email },
    });

    if (user) {
      if (user.provider === ProviderEnum.System) {
        throw new ConflictException("Email Already Exist");
      }
      return { user, isNew: false };
    }

    const newUser = await this.userRepo.create({
      email: resultPayload.email!,
      isVerified: resultPayload.email_verified!,
      userName:
        `${resultPayload.given_name ?? ""} ${resultPayload.family_name ?? ""}`.trim(),
      provider: ProviderEnum.Google!,
      profilePic: resultPayload.picture!,
    });

    return { user: newUser, isNew: true };
  };

  gmailAuth = async (idToken: string): Promise<ISocialLogin> => {
    const resultPayload = await this.verifyTokenGmail(idToken);

    if (!resultPayload.email_verified) {
      throw new UnauthorizedException("Email not verified with Google");
    }

    const { user, isNew } = await this.getOrCreateGmailUser(resultPayload);

    const { accessToken, refreshToken } = this.generateTokens(user as HUser);

    const statusCode = isNew ? 201 : 200;

    return { statusCode, user, accessToken, refreshToken };
  };

  forgetPassword = async (email: string): Promise<string> => {
    const isBlocked = await this.redisMethods.getString(
      `BLOCK::${email}::forgetPassword`,
    );
    if (isBlocked) {
      throw new TooManyRequestsException(
        "Too many requests. Please try again later.",
      );
    }

    await attempts({
      email,
      expireAt: 60 * 10,
      numOfAttempts: 3,
      type: "forgetPassword",
    });

    const user = (await this.userRepo.findOne({ filter: { email } })) as HUser;

    if (!user) {
      return "If this email exists, a reset link has been sent";
    }

    if (user.provider === ProviderEnum.Google) {
      return "If this email exists, a reset link has been sent";
    }

    const resetToken = jwt.sign({ email: user.email }, JWT_SECRET_USER, {
      expiresIn: "10m",
    });

    await this.redisMethods.setString({
      key: `passwordResetToken::${user.email}`,
      value: `${resetToken}`,
      expValue: 60 * 10,
    });

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace(
        "{resetURL}",
        `http://localhost:5173/reset-password/${resetToken}`,
      ),
    });

    return "If this email exists, a reset link has been sent";
  };

  resetPassword = async (
    newPassword: string,
    token: string,
  ): Promise<string> => {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_USER) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const { email } = decoded;

    const storedToken = await this.redisMethods.getString(
      `passwordResetToken::${email}`,
    );

    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const user = await this.userRepo.findOne({
      filter: { email },
    });

    if (!user) {
      throw new Error("User not found", { cause: { statusCode: 404 } });
    }

    user.password = await hashOperation({ plainText: newPassword });
    user.changeCreditTime = new Date();
    await user.save();

    await this.redisMethods.del(`passwordResetToken::${email}`);

    await sendEmail({
      to: user.email,
      subject: "Password reset successfully",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    });

    return "Password reset successfully";
  };
}

export default AuthService;
