import { Router } from "express";
import { authenticate } from "../../core/middleware/auth";
import { authorizeRoles } from "../../core/middleware/rbac";
import { asyncHandler } from "../../core/utils/async-handler";
import { approvalsController } from "./approvals.controller";

const router = Router();

// Authenticated users can list approvals (scoped by institute via service)
router.get(
  "/",
  authenticate,
  asyncHandler(approvalsController.list)
);

// HOD, Principal, and Admin can submit feedback/approval/rejection
router.post(
  "/",
  authenticate,
  authorizeRoles("HOD", "Principal", "Admin"),
  asyncHandler(approvalsController.submit)
);

export { router as approvalsRoutes };
