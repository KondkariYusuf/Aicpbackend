"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.institutesRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../core/middleware/auth");
const rbac_1 = require("../../core/middleware/rbac");
const async_handler_1 = require("../../core/utils/async-handler");
const institutes_controller_1 = require("./institutes.controller");
const router = (0, express_1.Router)();
exports.institutesRoutes = router;
// Public — used by registration dropdown (no auth required)
router.get("/", (0, async_handler_1.asyncHandler)(institutes_controller_1.institutesController.list));
// Admin-only — compliance stats for dashboard
router.get("/stats", auth_1.authenticate, (0, rbac_1.authorizeRoles)("Admin"), (0, async_handler_1.asyncHandler)(institutes_controller_1.institutesController.stats));
// Admin-only — create a new institute
router.post("/", auth_1.authenticate, (0, rbac_1.authorizeRoles)("Admin"), (0, async_handler_1.asyncHandler)(institutes_controller_1.institutesController.create));
