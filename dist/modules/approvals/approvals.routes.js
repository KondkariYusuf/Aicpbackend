"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../core/middleware/auth");
const rbac_1 = require("../../core/middleware/rbac");
const async_handler_1 = require("../../core/utils/async-handler");
const approvals_controller_1 = require("./approvals.controller");
const router = (0, express_1.Router)();
exports.approvalsRoutes = router;
// Authenticated users can list approvals (scoped by institute via service)
router.get("/", auth_1.authenticate, (0, async_handler_1.asyncHandler)(approvals_controller_1.approvalsController.list));
// HOD, Principal, and Admin can submit feedback/approval/rejection
router.post("/", auth_1.authenticate, (0, rbac_1.authorizeRoles)("HOD", "Principal", "Admin"), (0, async_handler_1.asyncHandler)(approvals_controller_1.approvalsController.submit));
