import Redis from "ioredis";
import config from "./index";

let redis: Redis | null = null;

export function createRedisClient(): Redis {
  if (redis) return redis;

  redis = new Redis(config.redis.url, {
    keyPrefix: config.redis.prefix,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 10000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  redis.on("connect", () => {
    console.log("✓ Redis connected successfully");
  });

  redis.on("error", (err) => {
    console.error("✗ Redis connection error:", err.message);
  });

  redis.on("close", () => {
    console.log("Redis connection closed");
  });

  return redis;
}

export const redisClient = createRedisClient();

export function getRedisClient(): Redis {
  if (!redis) {
    return createRedisClient();
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log("✓ Redis disconnected");
  }
}

export const redisConnection = {
  host: "localhost",
  port: 6379,
};

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  async expire(key: string, seconds: number): Promise<void> {
    const client = getRedisClient();
    await client.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    const client = getRedisClient();
    return client.ttl(key);
  },
};

export default getRedisClient;
