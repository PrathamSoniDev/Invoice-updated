import { Queue, Job } from "bullmq";
import { redisClient } from "../config/redis";
import config from "../config/index";
import logger from "../utils/logger";

export type QueueName =
  | "email"
  | "whatsapp"
  | "notification"
  | "invoice"
  | "export"
  | "report"
  | "cleanup"
  | "audit"
  | "sync"
  | "webhook"
  | "payment"
  | "communication";

interface QueueConfig {
  name: QueueName;
  concurrency: number;
}

const queueConfigs: QueueConfig[] = [
  { name: "email", concurrency: 5 },
  { name: "whatsapp", concurrency: 3 },
  { name: "notification", concurrency: 10 },
  { name: "invoice", concurrency: 5 },
  { name: "export", concurrency: 2 },
  { name: "report", concurrency: 2 },
  { name: "cleanup", concurrency: 1 },
  { name: "audit", concurrency: 10 },
  { name: "sync", concurrency: 3 },
  { name: "webhook", concurrency: 5 },
  { name: "payment", concurrency: 5 },
  { name: "communication", concurrency: 5 },
];

const connection = redisClient.duplicate();
const redisUrl = new URL(config.redis.url);
const queues = new Map<QueueName, Queue>();

let initialized = false;

export async function initializeQueues(): Promise<void> {
  if (initialized) {
    logger.info("BullMQ already initialized");
    return;
  }

  try {
    await connection.connect();
  } catch {
    // already connected
  }

  for (const cfg of queueConfigs) {
    const queue = new Queue(cfg.name, {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        username: redisUrl.username || undefined,
        password: redisUrl.password || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    });

    await queue.waitUntilReady();

    queues.set(cfg.name, queue);

    logger.info(`Queue initialized: ${cfg.name}`);
  }

  initialized = true;

  logger.info("BullMQ initialized successfully");
}

export function getQueue(name: QueueName): Queue {
  const queue = queues.get(name);

  if (!queue) {
    throw new Error(`Queue ${name} is not initialized`);
  }

  return queue;
}

export async function addJob<T>(
  queueName: QueueName,
  jobName: string,
  data: T,
  options?: Job["opts"],
) {
  return getQueue(queueName).add(jobName, data, options);
}

export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }

  queues.clear();

  await connection.quit();

  initialized = false;

  logger.info("BullMQ shut down successfully");
}

export { queues, connection };
