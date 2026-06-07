import multer from "multer";
import path from "node:path";
import { MulterStorageEnum } from "../Common/enums/index.js";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { BadRequestException } from "../Common/exceptions/domain.exception.js";
import type { Request } from "express";

export const ALLOWED_MIME_TYPES = ["image"];
export const ALLOWED_EXTENSIONS = ["jpeg", "jpg", "png"];

function multerStorage({
  storageType = MulterStorageEnum.Memory,
  maxSize = 5,
}: {
  storageType?: MulterStorageEnum;
  maxSize?: number;
}) {
  const storage =
    storageType === MulterStorageEnum.Memory
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination(req, file, callback) {
            callback(null, tmpdir());
          },
          filename(req, file, callback) {
            // Sanitize originalname to prevent path traversal attacks
            const safeName = path
              .basename(file.originalname)
              .replace(/\s+/g, "_");
            callback(null, `${randomUUID()}-${safeName}`);
          },
        });

  const fileFilter = function (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) {
    if (!file.mimetype || !file.mimetype.includes("/")) {
      return cb(new BadRequestException("Invalid or missing file MIME type"));
    }

    const [type, ext] = file.mimetype.split("/");

    if (!ALLOWED_MIME_TYPES.includes(type)) {
      return cb(new BadRequestException("This file type is not supported"));
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new BadRequestException("This extension is not supported"));
    }

    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSize * 1024 * 1024 },
  });
}

export default multerStorage;
