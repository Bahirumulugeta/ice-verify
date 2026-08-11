import { getRedis } from '../cache/redis.js';

export type QueueJobType =
  | 'verification.process'
  | 'webhook.deliver'
  | 'provider.health'
  | 'usage.process';

export interface QueueJob<T = unknown> {
  id: string;
  type: QueueJobType;
  payload: T;
  attempts: number;
  createdAt: string;
}

const QUEUE_KEY = 'ice:queue:jobs';
const memoryJobs: QueueJob[] = [];

export class RedisQueue {
  async enqueue<T>(type: QueueJobType, payload: T, id: string): Promise<void> {
    const job: QueueJob<T> = {
      id,
      type,
      payload,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    try {
      await getRedis().lpush(QUEUE_KEY, JSON.stringify(job));
    } catch {
      memoryJobs.push(job as QueueJob);
    }
  }

  async dequeue(timeoutSeconds = 5): Promise<QueueJob | null> {
    try {
      const result = await getRedis().brpop(QUEUE_KEY, timeoutSeconds);
      if (!result) return null;
      return JSON.parse(result[1]) as QueueJob;
    } catch {
      return memoryJobs.pop() ?? null;
    }
  }

  async depth(): Promise<number> {
    try {
      return await getRedis().llen(QUEUE_KEY);
    } catch {
      return memoryJobs.length;
    }
  }
}
