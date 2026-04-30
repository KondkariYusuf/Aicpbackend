import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis";
import { QUEUE_NAMES } from "./queue-names";
import { logger } from "../core/utils/logger";
import type { ExpiryCheckJobData, NotificationJobData, WorkflowNotificationJobData } from "./types";

// Lazy queue creation — only connects to Redis when first used
let _expiryCheckQueue: Queue<ExpiryCheckJobData> | null = null;
let _notificationQueue: Queue<NotificationJobData> | null = null;
let _workflowNotificationQueue: Queue<WorkflowNotificationJobData> | null = null;

function createQueueSafe<T>(name: string): Queue<T> | null {
  try {
    const connection = createRedisConnection();
    return new Queue<T>(name, {
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
  } catch (err) {
    logger.warn({ queue: name, error: err instanceof Error ? err.message : "Unknown" }, "Failed to create BullMQ queue — Redis may be unavailable");
    return null;
  }
}

export const expiryCheckQueue = {
  add: async (...args: Parameters<Queue<ExpiryCheckJobData>["add"]>) => {
    if (!_expiryCheckQueue) _expiryCheckQueue = createQueueSafe<ExpiryCheckJobData>(QUEUE_NAMES.EXPIRY_CHECK);
    if (!_expiryCheckQueue) throw new Error("Queue unavailable");
    return _expiryCheckQueue.add(...args);
  },
  close: async () => { if (_expiryCheckQueue) await _expiryCheckQueue.close(); }
};

export const notificationQueue = {
  add: async (...args: Parameters<Queue<NotificationJobData>["add"]>) => {
    if (!_notificationQueue) _notificationQueue = createQueueSafe<NotificationJobData>(QUEUE_NAMES.NOTIFICATION);
    if (!_notificationQueue) throw new Error("Queue unavailable");
    return _notificationQueue.add(...args);
  },
  close: async () => { if (_notificationQueue) await _notificationQueue.close(); }
};

export const workflowNotificationQueue = {
  add: async (...args: Parameters<Queue<WorkflowNotificationJobData>["add"]>) => {
    if (!_workflowNotificationQueue) _workflowNotificationQueue = createQueueSafe<WorkflowNotificationJobData>(QUEUE_NAMES.WORKFLOW_NOTIFICATION);
    if (!_workflowNotificationQueue) throw new Error("Queue unavailable");
    return _workflowNotificationQueue.add(...args);
  },
  close: async () => { if (_workflowNotificationQueue) await _workflowNotificationQueue.close(); }
};

export const closeQueues = async (): Promise<void> => {
  await Promise.all([
    expiryCheckQueue.close(),
    notificationQueue.close(),
    workflowNotificationQueue.close()
  ]);
};
