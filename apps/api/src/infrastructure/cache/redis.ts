import { Redis } from 'ioredis';
import { getConfig } from '../../config/env.js';

let redis: Redis | null = null;
let redisAvailable = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getConfig().REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 10) {
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => {
      redisAvailable = true;
    });
    redis.on('ready', () => {
      redisAvailable = true;
    });
    redis.on('close', () => {
      redisAvailable = false;
    });
    redis.on('end', () => {
      redisAvailable = false;
    });
    redis.on('error', () => {
      redisAvailable = false;
      // Swallow connection errors; callers/fallback handle unavailability.
    });
  }
  return redis;
}

export async function connectRedis(): Promise<boolean> {
  const client = getRedis();
  try {
    if (client.status === 'wait') {
      await client.connect();
    }
    await client.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    redis.removeAllListeners();
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
    redis = null;
    redisAvailable = false;
  }
}
