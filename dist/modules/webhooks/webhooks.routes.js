"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRoutes = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../core/utils/async-handler");
const webhooks_controller_1 = require("./webhooks.controller");
const router = (0, express_1.Router)();
exports.webhooksRoutes = router;
router.post("/storage/object-created", (0, async_handler_1.asyncHandler)(webhooks_controller_1.webhooksController.handleStorageObjectCreated));
