"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpiryWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../config/redis");
const logger_1 = require("../../core/utils/logger");
const queue_names_1 = require("../queue-names");
const expiry_check_service_1 = require("../services/expiry-check.service");
const createExpiryWorker = () => {
    const worker = new bullmq_1.Worker(queue_names_1.QUEUE_NAMES.EXPIRY_CHECK, async () => {
        const summary = await (0, expiry_check_service_1.runDailyExpiryCheck)();
        logger_1.logger.info(summary, "Expiry check completed");
        return summary;
    }, {
        connection: (0, redis_1.createRedisConnection)(),
        concurrency: 1
    });
    worker.on("failed", (job, err) => {
        logger_1.logger.error({ jobId: job?.id, error: err.message }, "Expiry worker job failed");
    });
    return worker;
};
exports.createExpiryWorker = createExpiryWorker;
