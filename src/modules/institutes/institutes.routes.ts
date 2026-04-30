import { Router } from "express";
import { authenticate } from "../../core/middleware/auth";
import { authorizeRoles } from "../../core/middleware/rbac";
import { asyncHandler } from "../../core/utils/async-handler";
import { institutesController } from "./institutes.controller";

const router = Router();

// Public — used by registration dropdown (no auth required)
router.get("/", asyncHandler(institutesController.list));

// Admin-only — compliance stats for dashboard
router.get(
  "/stats",
  authenticate,
  authorizeRoles("Admin"),
  asyncHandler(institutesController.stats)
);

// Admin-only — create a new institute
router.post(
  "/",
  authenticate,
  authorizeRoles("Admin"),
  asyncHandler(institutesController.create)
);

export { router as institutesRoutes };
