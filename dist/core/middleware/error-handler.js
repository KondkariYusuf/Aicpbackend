"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const AppError_1 = require("../errors/AppError");
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, _next) => {
    const requestId = req.requestId ?? null;
    if (err instanceof AppError_1.AppError) {
        logger_1.logger.warn({ requestId, err }, "Handled application error");
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            details: err.details ?? null,
            requestId
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        logger_1.logger.warn({ requestId, issues: err.issues }, "Validation failed");
        res.status(400).json({
            success: false,
            error: "Validation failed",
            details: err.issues,
            requestId
        });
        return;
    }
    const fallback = err instanceof Error ? err.message : "Internal server error";
    logger_1.logger.error({ requestId, err }, "Unhandled error");
    res.status(500).json({
        success: false,
        error: fallback,
        requestId
    });
};
exports.errorHandler = errorHandler;
