import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler";
import { authController } from "./auth.controller";

const router = Router();

router.post("/signup", asyncHandler(authController.signup));
router.post("/login", asyncHandler(authController.login));

export { router as authRoutes };
