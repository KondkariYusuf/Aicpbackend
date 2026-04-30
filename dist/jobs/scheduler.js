"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDailyExpiryChecker = void 0;
const queues_1 = require("./queues");
const DAILY_JOB_ID = "daily-expiry-check-utc";
const scheduleDailyExpiryChecker = async () => {
    await queues_1.expiryCheckQueue.add("daily-expiry-check", { triggeredBy: "scheduler" }, {
        jobId: DAILY_JOB_ID,
        repeat: {
            pattern: "0 0 * * *",
            tz: "UTC"
        }
    });
};
exports.scheduleDailyExpiryChecker = scheduleDailyExpiryChecker;
