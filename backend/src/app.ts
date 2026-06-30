import express from "express";
import { createServer } from "http";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import morgan from "morgan";
import hpp from "hpp";

import config from "./config";
import logger from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import {
  setupCorsMiddleware,
  setupHelmetMiddleware,
  setupCompressionMiddleware,
  generalRateLimiter,
} from "./middleware";
import routes from "./routes";
import { initializeQueues } from "./queues";
import { initializeSocketIO } from "./socket";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

app.use(setupCorsMiddleware());
app.use(setupHelmetMiddleware());
app.use(setupCompressionMiddleware());
app.use(hpp());
app.use(generalRateLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const morganFormat = config.app.env === "development" ? "dev" : "combined";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }),
);

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "InvoiceGen API",
      version: "1.0.0",
      description: "Enterprise Invoice Management System API",
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/validators/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export function startServer(): void {
  //initializeQueues();
  //  initializeSocketIO(httpServer);

  httpServer.listen(config.app.port, async () => {
    try {
      await initializeQueues();
      initializeSocketIO(httpServer);

      logger.info(`Server started on port ${config.app.port}`);
    } catch (error) {
      logger.error("Failed to initialize BullMQ", error);
      process.exit(1);
    }
  });
}

export { app, httpServer };
