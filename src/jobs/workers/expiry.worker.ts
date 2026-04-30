import { Worker } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../core/utils/logger";
import { QUEUE_NAMES } from "../queue-names";
import { runDailyExpiryCheck } from "../services/expiry-check.service";
import type { ExpiryCheckJobData } from "../types";

export const createExpiryWorker = (): Worker<ExpiryCheckJobData> => {
  const worker = new Worker<ExpiryCheckJobData>(
    QUEUE_NAMES.EXPIRY_CHECK,
    async () => {
      const summary = await runDailyExpiryCheck();
      logger.info(summary, "Expiry check completed");
      return summary;
    },
    {
      connection: createRedisConnection(),
      concurrency: 1
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Expiry worker job failed");
  });

  return worker;
};
