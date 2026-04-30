import { Router } from "express";
import { authenticate } from "../../core/middleware/auth";
import { authorizeRoles } from "../../core/middleware/rbac";
import { asyncHandler } from "../../core/utils/async-handler";
import { documentsController } from "./documents.controller";

const router = Router();

router.post(
  "/generate-upload-url",
  authenticate,
  authorizeRoles("Clerk"),
  asyncHandler(documentsController.generateUploadUrl)
);

router.post(
  "/confirm-upload",
  authenticate,
  authorizeRoles("Clerk"),
  asyncHandler(documentsController.confirmUpload)
);

router.post(
  "/generate-renewal-upload-url",
  authenticate,
  authorizeRoles("Clerk"),
  asyncHandler(documentsController.generateRenewalUploadUrl)
);

router.post(
  "/renewals/:id/review",
  authenticate,
  authorizeRoles("HOD", "Principal", "Admin"),
  asyncHandler(documentsController.reviewRenewal)
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("Clerk", "HOD", "Principal", "Admin"),
  asyncHandler(documentsController.deleteDocument)
);

export { router as documentsRoutes };
