"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const request_id_1 = require("./core/middleware/request-id");
const error_handler_1 = require("./core/middleware/error-handler");
const not_found_1 = require("./core/middleware/not-found");
const logger_1 = require("./core/utils/logger");
const auth_routes_1 = require("./modules/auth/auth.routes");
const documents_routes_1 = require("./modules/documents/documents.routes");
const institutes_routes_1 = require("./modules/institutes/institutes.routes");
const approvals_routes_1 = require("./modules/approvals/approvals.routes");
const webhooks_routes_1 = require("./modules/webhooks/webhooks.routes");
exports.app = (0, express_1.default)();
exports.app.disable("x-powered-by");
exports.app.use(logger_1.httpLogger);
exports.app.use(request_id_1.attachRequestId);
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN ?? true,
    credentials: true
}));
exports.app.use(express_1.default.json({ limit: "1mb" }));
// ── Global Rate Limiter ─────────────────────────────
// 100 requests per 15 minutes per IP across all /api/ routes
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests, please try again later."
    }
});
exports.app.use("/api/", apiLimiter);
exports.app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString()
        }
    });
});
exports.app.use("/api/auth", auth_routes_1.authRoutes);
exports.app.use("/api/documents", documents_routes_1.documentsRoutes);
exports.app.use("/api/institutes", institutes_routes_1.institutesRoutes);
exports.app.use("/api/approvals", approvals_routes_1.approvalsRoutes);
exports.app.use("/api/webhooks", webhooks_routes_1.webhooksRoutes);
exports.app.use(not_found_1.notFoundHandler);
exports.app.use(error_handler_1.errorHandler);
