import { Worker } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../core/utils/logger";
import { QUEUE_NAMES } from "../queue-names";
import { sendWhatsAppReminder } from "../../modules/notifications/whatsapp.service";
import type { NotificationJobData } from "../types";

const renderMilestone = (milestone: NotificationJobData["milestone"]): string => {
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

export const createNotificationWorker = (): Worker<NotificationJobData> => {
  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      const {
        documentName,
        instituteName,
        expiryDate,
        recipientName,
        recipientPhone,
        milestone,
        daysUntilExpiry
      } = job.data;

      const milestoneLabel = renderMilestone(milestone);

      logger.info(
        {
          jobId: job.id,
          documentName,
          instituteName,
          recipient: recipientName,
          milestone: milestoneLabel,
          daysRemaining: daysUntilExpiry
        },
        "Processing notification job"
      );

      // Dispatch via WhatsApp
      await sendWhatsAppReminder(
        recipientPhone,
        documentName,
        instituteName,
        `${expiryDate} (${milestoneLabel})`
      );

      logger.info(
        { jobId: job.id, recipient: recipientName },
        "Notification delivered"
      );

      return { sent: true, recipient: recipientName };
    },
    {
      connection: createRedisConnection(),
      concurrency: 5
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        recipient: job?.data?.recipientName,
        error: err.message
      },
      "Notification worker job failed"
    );
  });

  return worker;
};
