import IORedis from "ioredis";
import { env } from "./env";
import { logger } from "../core/utils/logger";

let redisWarningLogged = false;

export const createRedisConnection = (): IORedis => {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      // Only retry a few times, then stop to prevent log spam
      if (times > 3) {
        if (!redisWarningLogged) {
          logger.warn("Redis unavailable after 3 retries — BullMQ queues disabled. Start Redis to enable background jobs.");
          redisWarningLogged = true;
        }
        // Return null to stop retrying (ioredis will emit 'end')
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
    lazyConnect: true,
    enableOfflineQueue: false
  });

  // Suppress unhandled error events (prevent process crash)
  connection.on("error", (err) => {
    if (!redisWarningLogged) {
      logger.warn({ error: err.message }, "Redis connection error — BullMQ queues unavailable");
      redisWarningLogged = true;
    }
    // Silently swallow subsequent errors to prevent log spam
  });

  connection.on("connect", () => {
    redisWarningLogged = false;
    logger.info("Redis connected");
  });

  // Attempt to connect but don't block or crash
  connection.connect().catch(() => {
    // Error already logged by the 'error' event handler
  });

  return connection;
};
