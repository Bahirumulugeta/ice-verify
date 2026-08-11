import type { CachePort } from '../../application/ports.js';

interface Entry {
  value: string;
  expiresAt: number;
}

export class MemoryCache implements CachePort {
  private readonly store = new Map<string, Entry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async incrWithExpire(key: string, ttlSeconds: number): Promise<number> {
    const current = await this.get(key);
    const next = Number(current ?? '0') + 1;
    await this.set(key, String(next), ttlSeconds);
    return next;
  }
}
