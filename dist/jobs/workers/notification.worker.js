"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../config/redis");
const logger_1 = require("../../core/utils/logger");
const queue_names_1 = require("../queue-names");
const whatsapp_service_1 = require("../../modules/notifications/whatsapp.service");
const renderMilestone = (milestone) => {
    switch (milestone) {
        case "THREE_MONTHS":
            return "3 months";
        case "ONE_MONTH":
            return "1 month";
        case "EXACT_DAY":
            return "today";
        default:
            return milestone;
    }
};
const createNotificationWorker = () => {
    const worker = new bullmq_1.Worker(queue_names_1.QUEUE_NAMES.NOTIFICATION, async (job) => {
        const { documentName, instituteName, expiryDate, recipientName, recipientPhone, milestone, daysUntilExpiry } = job.data;
        const milestoneLabel = renderMilestone(milestone);
        logger_1.logger.info({
            jobId: job.id,
            documentName,
            instituteName,
            recipient: recipientName,
            milestone: milestoneLabel,
            daysRemaining: daysUntilExpiry
        }, "Processing notification job");
        // Dispatch via WhatsApp
        await (0, whatsapp_service_1.sendWhatsAppReminder)(recipientPhone, documentName, instituteName, `${expiryDate} (${milestoneLabel})`);
        logger_1.logger.info({ jobId: job.id, recipient: recipientName }, "Notification delivered");
        return { sent: true, recipient: recipientName };
    }, {
        connection: (0, redis_1.createRedisConnection)(),
        concurrency: 5
    });
    worker.on("failed", (job, err) => {
        logger_1.logger.error({
            jobId: job?.id,
            recipient: job?.data?.recipientName,
            error: err.message
        }, "Notification worker job failed");
    });
    return worker;
};
exports.createNotificationWorker = createNotificationWorker;
