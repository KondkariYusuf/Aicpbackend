import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";

export const logger = pino({
  name: "aicp-backend",
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "req.headers.x-webhook-secret"],
    remove: true
  }
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"]?.toString() ?? randomUUID(),
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
