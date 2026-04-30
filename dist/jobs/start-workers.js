"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../core/utils/logger");
const queues_1 = require("./queues");
const scheduler_1 = require("./scheduler");
const expiry_worker_1 = require("./workers/expiry.worker");
const notification_worker_1 = require("./workers/notification.worker");
const workflow_notification_worker_1 = require("./workers/workflow-notification.worker");
let workers = [];
const start = async () => {
    await (0, scheduler_1.scheduleDailyExpiryChecker)();
    workers = [
        (0, expiry_worker_1.createExpiryWorker)(),
        (0, notification_worker_1.createNotificationWorker)(),
        (0, workflow_notification_worker_1.createWorkflowNotificationWorker)()
    ];
    logger_1.logger.info("Workers started: expiry, notification, workflow-notification");
};
const shutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}, closing workers`);
    await Promise.all(workers.map((worker) => worker.close()));
    await (0, queues_1.closeQueues)();
    process.exit(0);
};
start().catch((error) => {
    logger_1.logger.error("Failed to start workers", error);
    process.exit(1);
});
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
