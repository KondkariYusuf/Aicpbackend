import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./core/utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`AICP API running on port ${env.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down API server`);
  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error while closing server");
      process.exit(1);
      return;
    }

    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
