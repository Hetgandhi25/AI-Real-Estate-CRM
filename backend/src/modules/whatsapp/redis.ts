import { Redis } from "ioredis";
import { env } from "../../config/env.js";

// Centralized Redis connection module
// maxRetriesPerRequest must be null for BullMQ
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  retryStrategy(times: number) {
    // Retry connection with exponential backoff up to 2 seconds
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on("error", (err: Error) => {
  console.error("❌ [Redis] Connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("✅ [Redis] Connected successfully.");
});
