"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./core/utils/logger");
const server = app_1.app.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`AICP API running on port ${env_1.env.PORT}`);
});
const shutdown = (signal) => {
    logger_1.logger.info(`Received ${signal}, shutting down API server`);
    server.close((err) => {
        if (err) {
            logger_1.logger.error({ err }, "Error while closing server");
            process.exit(1);
            return;
        }
        process.exit(0);
    });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
