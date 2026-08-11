import type { QueueJob, QueueJobType } from './queue.js';
import type { QueuePort } from '../../application/ports.js';

const jobs: QueueJob[] = [];

export class MemoryQueue implements QueuePort {
  async enqueue<T>(type: QueueJobType, payload: T, id: string): Promise<void> {
    jobs.push({
      id,
      type,
      payload,
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  }

  async dequeue(): Promise<QueueJob | null> {
    return jobs.pop() ?? null;
  }

  async depth(): Promise<number> {
    return jobs.length;
  }
}
