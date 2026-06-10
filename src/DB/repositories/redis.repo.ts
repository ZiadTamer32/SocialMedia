import { Types } from "mongoose";
import { client } from "../redis.connection.js";
class RedisRepo {
  constructor() {}

  async setString({
    key,
    value,
    expType = "EX",
    expValue,
  }: {
    key: string;
    value: string | number;
    expType?: "EX" | "PX" | "EXAT" | "PXAT";
    expValue?: number;
  }) {
    return await client.set(key, value, {
      expiration: { type: expType, value: Math.floor(expValue!) },
    });
  }

  async getString(key: string) {
    return await client.get(key);
  }

  async incr(key: string) {
    return await client.incr(key);
  }

  async mget(...keys: string[]) {
    return await client.mGet(keys);
  }

  async del(...keys: string[]) {
    return await client.del(keys);
  }

  async ttl(key: string) {
    return await client.ttl(key);
  }

  async expire(key: string, seconds: number) {
    return await client.expire(key, Math.floor(seconds));
  }

  async persist(key: string) {
    return await client.persist(key);
  }

  async exists(key: string) {
    return await client.exists(key);
  }

  async update(key: string, value: string) {
    const isExist = await this.exists(key);
    if (!isExist) return 0;
    await client.set(key, value);
    return 1;
  }

  // Notification-FCM
  async addToSet(userId: Types.ObjectId | string, FCMToken: string) {
    return await client.sAdd(`FCMToken::${userId}`, FCMToken);
  }
  async getSet(userId: Types.ObjectId | string) {
    return await client.sMembers(`FCMToken::${userId}`);
  }

  // Socket-Io
  async addToSocketIo(userId: Types.ObjectId | string, socketId: string) {
    return await client.sAdd(`SocketIo::${userId}`, socketId);
  }
  async getSocketIo(userId: Types.ObjectId | string) {
    return await client.sMembers(`SocketIo::${userId}`);
  }
  async removeSocketIo(userId: Types.ObjectId | string, socketId: string) {
    return await client.sRem(`SocketIo::${userId}`, socketId);
  }
}

export default new RedisRepo();
