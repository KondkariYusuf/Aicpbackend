"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueues = exports.workflowNotificationQueue = exports.notificationQueue = exports.expiryCheckQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const queue_names_1 = require("./queue-names");
const connection = (0, redis_1.createRedisConnection)();
exports.expiryCheckQueue = new bullmq_1.Queue(queue_names_1.QUEUE_NAMES.EXPIRY_CHECK, {
    connection,
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000
        }
    }
});
exports.notificationQueue = new bullmq_1.Queue(queue_names_1.QUEUE_NAMES.NOTIFICATION, {
    connection,
    defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 2000
        }
    }
});
exports.workflowNotificationQueue = new bullmq_1.Queue(queue_names_1.QUEUE_NAMES.WORKFLOW_NOTIFICATION, {
    connection,
    defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000
        }
    }
});
const closeQueues = async () => {
    await Promise.all([
        exports.expiryCheckQueue.close(),
        exports.notificationQueue.close(),
        exports.workflowNotificationQueue.close(),
        connection.quit()
    ]);
};
exports.closeQueues = closeQueues;
