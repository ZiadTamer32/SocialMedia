import mongoose, { HydratedDocument } from "mongoose";
import {
  GenderEnum,
  ProviderEnum,
  RoleEnum,
} from "../../Common/enums/index.js";
import { IUser } from "../../Common/interface/index.js";
import { hashOperation } from "../../Common/security/hash.js";
import { encryption } from "../../Common/security/crypto.js";
import sendOTP from "../../Common/mails/sendOTP.js";
import { VERIFICATION_EMAIL_TEMPLATE } from "../../Common/constants.js";
import { Types } from "mongoose";

export type HUser = HydratedDocument<IUser>;

const userSchema = new mongoose.Schema<IUser>(
  {
    userName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 15,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (): boolean {
        return this.provider === ProviderEnum.System;
      },
    },
    phone: {
      type: String,
      required: function (): boolean {
        return this.provider === ProviderEnum.System;
      },
    },
    gender: {
      type: Number,
      enum: GenderEnum,
      required: function (): boolean {
        return this.provider === ProviderEnum.System;
      },
    },
    role: {
      type: String,
      required: true,
      enum: RoleEnum,
      default: RoleEnum.User,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: Number,
      enum: ProviderEnum,
      default: ProviderEnum.System,
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    profilePic: String,
    friends: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    coverPics: [String],
    gallery: [String],
    DOB: Date,
    deletedAt: Date,
    changeCreditTime: Date,
    isSoftDeleted: Boolean,
    twoStepVerification: {
      type: Boolean,
      default: function (): boolean | undefined {
        return this.provider === ProviderEnum.System ? false : undefined;
      },
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (this: HUser & { wasNew: boolean }) {
  this.wasNew = this.isNew;
  if (this.password && this.isModified("password")) {
    this.password = await hashOperation({ plainText: this.password as string });
  }

  if (this.phone && this.isModified("phone")) {
    this.phone = encryption(this.phone);
  }
});

userSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();
  if (!query.isSoftDeleted) {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

userSchema.post("save", function (this: HUser & { wasNew: boolean }) {
  if (this.wasNew) {
    sendOTP({
      email: this.email,
      subject: "Verify your email",
      template: VERIFICATION_EMAIL_TEMPLATE,
    }).catch((err) =>
      console.error(`Email Error Failed to send OTP to ${this.email}:`, err),
    );
  }
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
