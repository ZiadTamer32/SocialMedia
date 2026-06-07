import { createClient } from "redis";
import { REDIS_URL } from "../config/app.config.js";

export const client = createClient({
  url: REDIS_URL,
});

client.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

export async function testRedisConnection() {
  try {
    await client.connect();
    console.log("Redis connected successfully");
  } catch (error: any) {
    console.error("Redis connection failed:", error.message);
  }
}
