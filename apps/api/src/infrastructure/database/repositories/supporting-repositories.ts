import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import type {
  AuditRepository,
  CachePort,
  DuplicateRepository,
  IdempotencyRepository,
  UsageRepository,
  WebhookRepository,
} from '../../../application/ports.js';
import { getRedis } from '../../cache/redis.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class PrismaIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(merchantId: string, key: string) {
    const row = await this.prisma.idempotencyKey.findUnique({
      where: { merchantId_key: { merchantId, key } },
    });
    if (!row) return null;
    return {
      requestHash: row.requestHash,
      responseJson: row.responseJson,
      statusCode: row.statusCode,
    };
  }

  async save(input: {
    merchantId: string;
    key: string;
    requestHash: string;
    responseJson: unknown;
    statusCode: number;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.idempotencyKey.upsert({
      where: { merchantId_key: { merchantId: input.merchantId, key: input.key } },
      create: {
        merchantId: input.merchantId,
        key: input.key,
        requestHash: input.requestHash,
        responseJson: asJson(input.responseJson),
        statusCode: input.statusCode,
        expiresAt: input.expiresAt,
      },
      update: {
        requestHash: input.requestHash,
        responseJson: asJson(input.responseJson),
        statusCode: input.statusCode,
        expiresAt: input.expiresAt,
      },
    });
  }
}

export class PrismaDuplicateRepository implements DuplicateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async markAndCheck(input: {
    merchantId: string;
    provider: string;
    reference: string;
    forceDuplicate?: boolean;
  }): Promise<{ isDuplicate: boolean; count: number }> {
    const existing = await this.prisma.duplicateReference.findUnique({
      where: {
        merchantId_provider_reference_scope: {
          merchantId: input.merchantId,
          provider: input.provider,
          reference: input.reference,
          scope: 'merchant',
        },
      },
    });

    if (!existing) {
      await this.prisma.duplicateReference.create({
        data: {
          merchantId: input.merchantId,
          provider: input.provider,
          reference: input.reference,
          scope: 'merchant',
          count: 1,
        },
      });
      return { isDuplicate: Boolean(input.forceDuplicate), count: 1 };
    }

    const updated = await this.prisma.duplicateReference.update({
      where: { id: existing.id },
      data: { count: { increment: 1 }, lastSeenAt: new Date() },
    });

    return {
      isDuplicate: true,
      count: updated.count,
    };
  }
}

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async write(input: {
    merchantId?: string;
    actorUserId?: string;
    actorType: string;
    action: string;
    resource: string;
    resourceId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        merchantId: input.merchantId,
        actorUserId: input.actorUserId,
        actorType: input.actorType,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        requestId: input.requestId,
        metadataJson: asJson(input.metadata ?? {}),
      },
    });
  }
}

export class PrismaUsageRepository implements UsageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async track(input: {
    merchantId: string;
    metric: string;
    value?: number;
    provider?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.usageRecord.create({
      data: {
        merchantId: input.merchantId,
        metric: input.metric,
        value: input.value ?? 1,
        provider: input.provider,
        metadataJson: asJson(input.metadata ?? {}),
      },
    });
  }

  async summarize(merchantId: string, since: Date): Promise<Record<string, number>> {
    const rows = await this.prisma.usageRecord.groupBy({
      by: ['metric'],
      where: { merchantId, recordedAt: { gte: since } },
      _sum: { value: true },
    });
    return Object.fromEntries(rows.map((row) => [row.metric, row._sum.value ?? 0]));
  }
}

export class PrismaWebhookRepository implements WebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(merchantId: string) {
    return this.prisma.webhook.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        enabled: true,
        description: true,
        secretPrefix: true,
        createdAt: true,
      },
    });
  }

  async create(input: {
    merchantId: string;
    url: string;
    events: string[];
    description?: string;
    secretHash: string;
    secretPrefix: string;
  }): Promise<{ id: string }> {
    const row = await this.prisma.webhook.create({
      data: {
        merchantId: input.merchantId,
        url: input.url,
        events: input.events,
        description: input.description,
        secretHash: input.secretHash,
        secretPrefix: input.secretPrefix,
      },
      select: { id: true },
    });
    return row;
  }

  async delete(merchantId: string, id: string): Promise<boolean> {
    const result = await this.prisma.webhook.deleteMany({ where: { id, merchantId } });
    return result.count > 0;
  }

  async createDelivery(input: {
    id: string;
    webhookId: string;
    event: string;
    payload: unknown;
  }): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        id: input.id,
        webhookId: input.webhookId,
        event: input.event,
        payloadJson: asJson(input.payload),
        status: 'PENDING',
      },
    });
  }

  async listEnabledForEvent(merchantId: string, event: string) {
    const rows = await this.prisma.webhook.findMany({
      where: { merchantId, enabled: true },
      select: { id: true, url: true, secretHash: true, events: true },
    });
    return rows
      .filter((row) => row.events.includes(event))
      .map(({ id, url, secretHash }) => ({ id, url, secretHash }));
  }
}

export class RedisCache implements CachePort {
  private readonly fallback = new Map<string, { value: string; expiresAt: number }>();

  private readFallback(key: string): string | null {
    const entry = this.fallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.fallback.delete(key);
      return null;
    }
    return entry.value;
  }

  private writeFallback(key: string, value: string, ttlSeconds: number): void {
    this.fallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await getRedis().get(key);
    } catch {
      return this.readFallback(key);
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await getRedis().set(key, value, 'EX', ttlSeconds);
    } catch {
      this.writeFallback(key, value, ttlSeconds);
    }
  }

  async incrWithExpire(key: string, ttlSeconds: number): Promise<number> {
    try {
      const redis = getRedis();
      const value = await redis.incr(key);
      if (value === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return value;
    } catch {
      const current = Number(this.readFallback(key) ?? '0') + 1;
      this.writeFallback(key, String(current), ttlSeconds);
      return current;
    }
  }
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
