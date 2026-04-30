"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksController = void 0;
const env_1 = require("../../config/env");
const AppError_1 = require("../../core/errors/AppError");
const webhooks_schemas_1 = require("./webhooks.schemas");
const webhooks_service_1 = require("./webhooks.service");
const assertWebhookSecret = (req) => {
    if (!env_1.env.WEBHOOK_SHARED_SECRET) {
        return;
    }
    const headerSecret = req.header("x-webhook-secret");
    if (!headerSecret || headerSecret !== env_1.env.WEBHOOK_SHARED_SECRET) {
        throw new AppError_1.AppError("Invalid webhook signature", 401);
    }
};
exports.webhooksController = {
    handleStorageObjectCreated: async (req, res) => {
        assertWebhookSecret(req);
        const payload = webhooks_schemas_1.storageObjectCreatedSchema.parse(req.body);
        await webhooks_service_1.webhooksService.onStorageObjectCreated(payload);
        res.status(202).json({
            success: true,
            data: {
                accepted: true
            }
        });
    }
};
