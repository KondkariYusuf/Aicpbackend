"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const node_crypto_1 = require("node:crypto");
const env_1 = require("../../config/env");
exports.logger = (0, pino_1.default)({
    name: "aicp-backend",
    level: env_1.env.LOG_LEVEL,
    redact: {
        paths: ["req.headers.authorization", "req.headers.x-webhook-secret"],
        remove: true
    }
});
exports.httpLogger = (0, pino_http_1.default)({
    logger: exports.logger,
    genReqId: (req) => req.headers["x-request-id"]?.toString() ?? (0, node_crypto_1.randomUUID)(),
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) {
            return "error";
        }
        if (res.statusCode >= 400) {
            return "warn";
        }
        return "info";
    }
});
