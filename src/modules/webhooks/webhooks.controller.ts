import type { Request, Response } from "express";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/AppError";
import { storageObjectCreatedSchema } from "./webhooks.schemas";
import { webhooksService } from "./webhooks.service";

const assertWebhookSecret = (req: Request): void => {
  if (!env.WEBHOOK_SHARED_SECRET) {
    return;
  }

  const headerSecret = req.header("x-webhook-secret");
  if (!headerSecret || headerSecret !== env.WEBHOOK_SHARED_SECRET) {
    throw new AppError("Invalid webhook signature", 401);
  }
};

export const webhooksController = {
  handleStorageObjectCreated: async (req: Request, res: Response) => {
    assertWebhookSecret(req);

    const payload = storageObjectCreatedSchema.parse(req.body);
    await webhooksService.onStorageObjectCreated(payload);

    res.status(202).json({
      success: true,
      data: {
        accepted: true
      }
    });
  }
};
