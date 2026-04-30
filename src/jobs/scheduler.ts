import { expiryCheckQueue } from "./queues";

const DAILY_JOB_ID = "daily-expiry-check-utc";

export const scheduleDailyExpiryChecker = async (): Promise<void> => {
  await expiryCheckQueue.add(
    "daily-expiry-check",
    { triggeredBy: "scheduler" },
    {
      jobId: DAILY_JOB_ID,
      repeat: {
        pattern: "0 0 * * *",
        tz: "UTC"
      }
    }
  );
};
