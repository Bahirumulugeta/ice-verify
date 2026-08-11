import { RiskEngine } from '@ice/domain';
import { getConfig } from './config/env.js';
import { CreateVerificationUseCase } from './application/verification/create-verification.js';
import { getPrisma } from './infrastructure/database/prisma.js';
import {
  PrismaAuditRepository,
  PrismaDuplicateRepository,
  PrismaIdempotencyRepository,
  PrismaUsageRepository,
  PrismaWebhookRepository,
  RedisCache,
} from './infrastructure/database/repositories/supporting-repositories.js';
import { PrismaVerificationRepository } from './infrastructure/database/repositories/verification-repository.js';
import { PrismaPaymentClaimRepository } from './infrastructure/database/repositories/payment-claim-repository.js';
import { createProviderRegistry } from './infrastructure/providers/registry-factory.js';
import { RedisQueue } from './infrastructure/queue/queue.js';
import { MemoryCache } from './infrastructure/cache/memory-cache.js';
import { MemoryQueue } from './infrastructure/queue/memory-queue.js';
import { createLogger } from './infrastructure/logging/logger.js';
import type { CachePort, QueuePort } from './application/ports.js';

export function createContainer() {
  const config = getConfig();
  const prisma = getPrisma();
  const logger = createLogger('api');
  const providers = createProviderRegistry(config);
  const verifications = new PrismaVerificationRepository(prisma);
  const duplicates = new PrismaDuplicateRepository(prisma);
  const claims = new PrismaPaymentClaimRepository(prisma);
  const audits = new PrismaAuditRepository(prisma);
  const usage = new PrismaUsageRepository(prisma);
  const webhooks = new PrismaWebhookRepository(prisma);
  const idempotency = new PrismaIdempotencyRepository(prisma);
  const preferMemory =
    process.env.ICE_USE_MEMORY_INFRA === 'true' || config.NODE_ENV === 'test';

  // Redis clients include in-process fallbacks when Redis is down.
  // Explicit memory mode is used for tests / offline local development.
  const queue: QueuePort = preferMemory ? new MemoryQueue() : new RedisQueue();
  const cache: CachePort = preferMemory ? new MemoryCache() : new RedisCache();
  const riskEngine = new RiskEngine();

  if (preferMemory) {
    logger.warn('Using in-memory cache/queue (ICE_USE_MEMORY_INFRA or test mode)');
  }

  const createVerification = new CreateVerificationUseCase({
    providers,
    verifications,
    duplicates,
    claims,
    audits,
    usage,
    webhooks,
    queue,
    cache,
    riskEngine,
    cacheTtlSeconds: config.VERIFICATION_CACHE_TTL_SECONDS,
    duplicateWindowHours: config.DUPLICATE_WINDOW_HOURS,
  });

  return {
    config,
    prisma,
    logger,
    providers,
    verifications,
    duplicates,
    claims,
    audits,
    usage,
    webhooks,
    idempotency,
    queue,
    cache,
    createVerification,
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
