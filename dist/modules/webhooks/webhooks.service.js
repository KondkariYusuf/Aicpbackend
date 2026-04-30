"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksService = void 0;
const logger_1 = require("../../core/utils/logger");
exports.webhooksService = {
    onStorageObjectCreated: async (payload) => {
        logger_1.logger.info({
            bucket: payload.bucket,
            objectKey: payload.key,
            size: payload.size,
            mimeType: payload.mimeType ?? "unknown",
            createdAt: payload.createdAt
        }, "Received storage object created webhook");
    }
};
