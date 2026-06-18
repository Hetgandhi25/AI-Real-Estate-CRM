import { redisConnection } from "./redis.js";
import { logger } from "../../lib/logger.js";
import { lockAcquisitionTotal } from "../../lib/metrics.js";

/**
 * A Lua script to atomically release a lock only if the value matches the one set by this worker.
 * This prevents a delayed worker from accidentally deleting the lock of another worker.
 */
const UNLOCK_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * A Lua script to atomically refresh a lock TTL only if the worker still owns it.
 */
const REFRESH_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
else
    return 0
end
`;

/**
 * Distributed Lock Service using Redis.
 * Guarantees mutual exclusion across distributed workers.
 */
export class DistributedLockService {
  /**
   * Attempts to acquire a distributed lock.
   * @param phone The WhatsApp phone number (used as the lock key)
   * @param workerId A unique UUID representing this exact worker execution
   * @param ttlMs Time-to-live in milliseconds
   * @returns true if acquired, false otherwise
   */
  static async acquireLock(phone: string, workerId: string, ttlMs: number = 90000): Promise<boolean> {
    const lockKey = `conversation:${phone}`;
    const result = await redisConnection.set(lockKey, workerId, "PX", ttlMs, "NX");
    const acquired = result === "OK";
    if (acquired) {
      lockAcquisitionTotal.inc();
      logger.info({ phone, workerId }, "Acquired distributed lock");
    }
    return acquired;
  }

  /**
   * Refreshes the TTL of an existing lock to prevent it from expiring during a long operation.
   * @param phone The WhatsApp phone number
   * @param workerId The UUID of this worker execution
   * @param ttlMs The new TTL to apply in milliseconds
   */
  static async refreshLock(phone: string, workerId: string, ttlMs: number = 90000): Promise<boolean> {
    const lockKey = `conversation:${phone}`;
    const result = await redisConnection.eval(REFRESH_LUA_SCRIPT, 1, lockKey, workerId, ttlMs);
    const refreshed = result === 1;
    if (!refreshed) {
      logger.warn({ phone, workerId }, "Refresh failed. Worker lost ownership.");
    }
    return refreshed;
  }

  /**
   * Releases the lock atomically using a Lua script.
   * @param phone The WhatsApp phone number
   * @param workerId The UUID of this worker execution
   */
  static async releaseLock(phone: string, workerId: string): Promise<boolean> {
    const lockKey = `conversation:${phone}`;
    const result = await redisConnection.eval(UNLOCK_LUA_SCRIPT, 1, lockKey, workerId);
    const released = result === 1;
    if (released) {
      logger.info({ phone, workerId }, "Released distributed lock");
    } else {
      logger.warn({ phone, workerId }, "Release failed or skipped (did not own lock)");
    }
    return released;
  }
}
