import { logger } from "../../core/utils/logger";
import type { StorageObjectCreatedPayload } from "./webhooks.schemas";

export const webhooksService = {
  onStorageObjectCreated: async (payload: StorageObjectCreatedPayload): Promise<void> => {
    logger.info(
      {
        bucket: payload.bucket,
        objectKey: payload.key,
        size: payload.size,
        mimeType: payload.mimeType ?? "unknown",
        createdAt: payload.createdAt
      },
      "Received storage object created webhook"
    );
  }
};
