import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { randomUUID } from "node:crypto";
import {
  AWS_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_MAIN_PATH,
  AWS_REGION,
  AWS_SECRET_ACCESS,
} from "../../config/app.config.js";
import { MulterStorageEnum } from "../enums/index.js";
import { createReadStream } from "node:fs";

class S3BucketSerivce {
  private _client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_ACCESS,
    },
  });

  constructor() {}

  async uploadFile({
    file,
    path,
  }: {
    file: Express.Multer.File;
    path: string;
  }) {
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: `${AWS_MAIN_PATH}/${path}/${randomUUID()}_${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: ObjectCannedACL.private,
    });

    await this._client.send(command);

    return command.input.Key!;
  }

  async createPreSignUrl({
    originalName,
    mimeType,
    path,
  }: {
    originalName: string;
    mimeType: string;
    path: string;
  }) {
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: `${AWS_MAIN_PATH}/${path}/${randomUUID()}_${originalName}`,
      ContentType: mimeType,
      ACL: ObjectCannedACL.private,
    });

    const url = await getSignedUrl(this._client, command, { expiresIn: 3600 });

    return { key: command.input.Key!, url };
  }

  async uploadLargeFile({
    file,
    path,
    maxChunks = 25,
    uploadType = MulterStorageEnum.Disk,
  }: {
    file: Express.Multer.File;
    path: string;
    maxChunks?: number;
    uploadType?: MulterStorageEnum;
  }) {
    const command = new Upload({
      client: this._client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        Key: `${AWS_MAIN_PATH}/${path}/${randomUUID()}_${file.originalname}`,
        Body:
          uploadType === MulterStorageEnum.Memory
            ? file.buffer
            : createReadStream(file.path),
        ContentType: file.mimetype,
      },
      partSize: 1024 * 1024 * maxChunks,
    });

    command.on("httpUploadProgress", (progress) => {
      console.log(
        `${((progress.loaded as number) / (progress.total as number)) * 100} %`,
      );
    });

    const result = await command.done();

    return result.Key;
  }

  async uploadFiles({
    files,
    path,
    uploadType = MulterStorageEnum.Memory,
  }: {
    files: Express.Multer.File[];
    path: string;
    uploadType?: MulterStorageEnum;
  }) {
    const keys = await Promise.all(
      files.map((file: Express.Multer.File) => {
        return uploadType === MulterStorageEnum.Memory
          ? this.uploadFile({ file, path })
          : this.uploadLargeFile({
              file,
              path,
              uploadType: MulterStorageEnum.Disk,
            });
      }),
    );
    return keys;
  }

  async getFile(Key: string) {
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });

    return await this._client.send(command);
  }

  async createPreSignUrlGetFile(Key: string) {
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });

    const url = await getSignedUrl(this._client, command, { expiresIn: 3600 });

    return { key: command.input.Key!, url };
  }

  async deleteFile(Key: string, retries = 3) {
    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key,
    });

    let attempt = 0;
    while (attempt < retries) {
      try {
        return await this._client.send(command);
      } catch (error) {
        attempt++;
        if (attempt >= retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error("Expected at least 1 retry attempt.");
  }

  async deleteFiles(Keys: { Key: string }[], retries = 3) {
    const command = new DeleteObjectsCommand({
      Bucket: AWS_BUCKET_NAME,
      Delete: { Objects: Keys },
    });

    let attempt = 0;
    while (attempt < retries) {
      try {
        return await this._client.send(command);
      } catch (error) {
        attempt++;
        if (attempt >= retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error("Expected at least 1 retry attempt.");
  }

  async listFiles(path: string) {
    const command = new ListObjectsV2Command({
      Bucket: AWS_BUCKET_NAME,
      Prefix: `${AWS_MAIN_PATH}/${path}`,
    });

    return await this._client.send(command);
  }
}

export default new S3BucketSerivce();
