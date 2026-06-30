import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { redisClient } from "./config/redis";
import { startServer } from "./app";
import logger from "./utils/logger";

async function bootstrap() {
  try {
    console.log("1. Starting bootstrap");

    console.log("2. Connecting database...");
    await connectDatabase();
    console.log("3. Database connected");

    console.log("4. Connecting Redis...");
    await redisClient.ping();
    logger.info("Redis connected");
    console.log("5. Redis connected");

    console.log("6. Starting HTTP server...");
    startServer();
    console.log("7. Bootstrap complete");
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await disconnectDatabase();
        await redisClient.quit();
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", { error });
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error });
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled rejection", { reason });
    });
  } catch (error) {
    logger.error("Failed to start application", { error });
    process.exit(1);
  }
}

bootstrap();
