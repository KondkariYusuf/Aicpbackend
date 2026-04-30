"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueues = exports.workflowNotificationQueue = exports.notificationQueue = exports.expiryCheckQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const queue_names_1 = require("./queue-names");
const logger_1 = require("../core/utils/logger");
// Lazy queue creation — only connects to Redis when first used
let _expiryCheckQueue = null;
let _notificationQueue = null;
let _workflowNotificationQueue = null;
function createQueueSafe(name) {
    try {
        const connection = (0, redis_1.createRedisConnection)();
        return new bullmq_1.Queue(name, {
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
    }
    catch (err) {
        logger_1.logger.warn({ queue: name, error: err instanceof Error ? err.message : "Unknown" }, "Failed to create BullMQ queue — Redis may be unavailable");
        return null;
    }
}
exports.expiryCheckQueue = {
    add: async (...args) => {
        if (!_expiryCheckQueue)
            _expiryCheckQueue = createQueueSafe(queue_names_1.QUEUE_NAMES.EXPIRY_CHECK);
        if (!_expiryCheckQueue)
            throw new Error("Queue unavailable");
        return _expiryCheckQueue.add(...args);
    },
    close: async () => { if (_expiryCheckQueue)
        await _expiryCheckQueue.close(); }
};
exports.notificationQueue = {
    add: async (...args) => {
        if (!_notificationQueue)
            _notificationQueue = createQueueSafe(queue_names_1.QUEUE_NAMES.NOTIFICATION);
        if (!_notificationQueue)
            throw new Error("Queue unavailable");
        return _notificationQueue.add(...args);
    },
    close: async () => { if (_notificationQueue)
        await _notificationQueue.close(); }
};
exports.workflowNotificationQueue = {
    add: async (...args) => {
        if (!_workflowNotificationQueue)
            _workflowNotificationQueue = createQueueSafe(queue_names_1.QUEUE_NAMES.WORKFLOW_NOTIFICATION);
        if (!_workflowNotificationQueue)
            throw new Error("Queue unavailable");
        return _workflowNotificationQueue.add(...args);
    },
    close: async () => { if (_workflowNotificationQueue)
        await _workflowNotificationQueue.close(); }
};
const closeQueues = async () => {
    await Promise.all([
        exports.expiryCheckQueue.close(),
        exports.notificationQueue.close(),
        exports.workflowNotificationQueue.close()
    ]);
};
exports.closeQueues = closeQueues;
