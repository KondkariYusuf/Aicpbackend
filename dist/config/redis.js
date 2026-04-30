"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("../core/utils/logger");
let redisWarningLogged = false;
const createRedisConnection = () => {
    const connection = new ioredis_1.default(env_1.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy(times) {
            // Only retry a few times, then stop to prevent log spam
            if (times > 3) {
                if (!redisWarningLogged) {
                    logger_1.logger.warn("Redis unavailable after 3 retries — BullMQ queues disabled. Start Redis to enable background jobs.");
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
            logger_1.logger.warn({ error: err.message }, "Redis connection error — BullMQ queues unavailable");
            redisWarningLogged = true;
        }
        // Silently swallow subsequent errors to prevent log spam
    });
    connection.on("connect", () => {
        redisWarningLogged = false;
        logger_1.logger.info("Redis connected");
    });
    // Attempt to connect but don't block or crash
    connection.connect().catch(() => {
        // Error already logged by the 'error' event handler
    });
    return connection;
};
exports.createRedisConnection = createRedisConnection;
