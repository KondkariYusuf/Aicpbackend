import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler";
import { webhooksController } from "./webhooks.controller";

const router = Router();

router.post(
  "/storage/object-created",
  asyncHandler(webhooksController.handleStorageObjectCreated)
);

export { router as webhooksRoutes };
