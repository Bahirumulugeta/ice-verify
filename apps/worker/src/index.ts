import { loadConfig } from '@ice/config';
import {
  RiskEngine,
  assertTransition,
  isSuccessfulVerification,
  mapProviderOutcomeToStatus,
} from '@ice/domain';
import { PrismaClient, type Prisma, type VerificationStatus } from '@prisma/client';
import { Redis } from 'ioredis';
import pino from 'pino';
import { createDecipheriv, createHash, createHmac } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { buildProviderRegistry } from './providers-bootstrap.js';

const config = loadConfig();
const logger = pino({
  name: 'worker',
  level: config.LOG_LEVEL,
  redact: { paths: ['authorization', 'secret', 'apiKey'], remove: true },
});
const prisma = new PrismaClient();
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 200, 2000);
  },
});
redis.on('error', () => {
  // Connection errors are handled by the worker loop / fallbacks.
});
interface QueueJob {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  createdAt: string;
}

const QUEUE_KEY = 'ice:queue:jobs';
const memoryJobs: QueueJob[] = [];

function encryptionKey(): Buffer {
  return createHash('sha256').update(config.API_KEY_PEPPER).digest();
}

function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function signWebhookPayload(secret: string, timestamp: number, deliveryId: string, body: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${deliveryId}.${body}`).digest('hex');
}

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '0.0.0.0') return true;
  if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

async function assertSafeWebhookUrl(urlString: string): Promise<void> {
  const url = new URL(urlString);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Invalid webhook protocol');
  }
  if (config.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('HTTPS required in production');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Blocked webhook host');
  }
  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((r) => r.address);
  if (addresses.some(isPrivateIp)) {
    throw new Error('Private network webhook blocked');
  }
}

async function enqueue(type: string, payload: unknown, id: string): Promise<void> {
  const job: QueueJob = {
    id,
    type,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  try {
    await redis.lpush(QUEUE_KEY, JSON.stringify(job));
  } catch {
    memoryJobs.push(job);
  }
}

async function dequeue(timeoutSeconds = 5): Promise<QueueJob | null> {
  try {
    const result = await redis.brpop(QUEUE_KEY, timeoutSeconds);
    if (!result) return memoryJobs.shift() ?? null;
    return JSON.parse(result[1]) as QueueJob;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));
    return memoryJobs.shift() ?? null;
  }
}

async function processVerification(verificationId: string, merchantId: string): Promise<void> {
  const providers = buildProviderRegistry(config);
  const riskEngine = new RiskEngine();
  const existing = await prisma.verificationRequest.findFirst({
    where: { id: verificationId, merchantId },
  });
  if (!existing) return;

  const activeClaim = await prisma.paymentClaim.findFirst({
    where: {
      provider: existing.provider,
      reference: existing.reference,
      status: 'CLAIMED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (activeClaim && activeClaim.merchantId !== merchantId) {
    await prisma.verificationRequest.update({
      where: { id: verificationId },
      data: {
        status: 'FAILED',
        verified: false,
        completedAt: new Date(),
        metadataJson: {
          ...((existing.metadataJson as object) ?? {}),
          errorCode: 'PAYMENT_ALREADY_CLAIMED',
          claimedAt: activeClaim.claimedAt.toISOString(),
        },
      },
    });
    return;
  }

  assertTransition(existing.status as never, 'PROCESSING');
  await prisma.verificationRequest.update({
    where: { id: verificationId },
    data: { status: 'PROCESSING' },
  });

  const provider = providers.get(existing.provider);
  const started = Date.now();
  const metadata = (existing.metadataJson as Record<string, unknown> | null) ?? {};

  try {
    const providerResult = await provider.verify({
      reference: existing.reference,
      accountSuffix: typeof metadata.accountSuffix === 'string' ? metadata.accountSuffix : undefined,
      phoneNumber: typeof metadata.phoneNumber === 'string' ? metadata.phoneNumber : undefined,
      expectedAmount: existing.expectedAmount?.toNumber(),
      currency: existing.currency ?? undefined,
      expectedReceiver: existing.expectedReceiver ?? undefined,
    });

    let status = mapProviderOutcomeToStatus(providerResult.outcome) as VerificationStatus;
    let amountMatches = true;
    let receiverMatches = true;
    let currencyMatches = true;

    if (providerResult.payment) {
      await prisma.paymentDetails.upsert({
        where: { verificationId },
        create: {
          verificationId,
          reference: providerResult.payment.reference,
          provider: providerResult.payment.provider,
          amount: providerResult.payment.amount,
          currency: providerResult.payment.currency,
          sender: providerResult.payment.sender,
          receiver: providerResult.payment.receiver,
          transactionDate: providerResult.payment.transactionDate,
          status: providerResult.payment.status,
          providerTransactionId: providerResult.payment.providerTransactionId,
          metadataJson: providerResult.payment.metadata as Prisma.InputJsonValue,
        },
        update: {
          amount: providerResult.payment.amount,
          currency: providerResult.payment.currency,
          receiver: providerResult.payment.receiver,
          status: providerResult.payment.status,
          metadataJson: providerResult.payment.metadata as Prisma.InputJsonValue,
        },
      });

      if (existing.expectedAmount != null) {
        amountMatches = providerResult.payment.amount === existing.expectedAmount.toNumber();
        if (!amountMatches) status = 'AMOUNT_MISMATCH';
      }
      if (existing.currency) {
        currencyMatches = providerResult.payment.currency === existing.currency;
      }
      if (existing.expectedReceiver) {
        receiverMatches =
          existing.expectedReceiver.replace(/\s+/g, '').toLowerCase() ===
          (providerResult.payment.receiver ?? '').replace(/\s+/g, '').toLowerCase();
        if (!receiverMatches) status = 'RECEIVER_MISMATCH';
      }
    }

    const dup = await prisma.duplicateReference.findUnique({
      where: {
        merchantId_provider_reference_scope: {
          merchantId,
          provider: existing.provider,
          reference: existing.reference,
          scope: 'merchant',
        },
      },
    });
    if (dup && dup.count > 0) {
      // already tracked by API create path; treat second+ as duplicate when forced
      if (providerResult.payment?.metadata?.forceDuplicate) status = 'DUPLICATE';
    }

    const risk = riskEngine.evaluate({
      paymentExists: providerResult.outcome === 'FOUND' || providerResult.outcome === 'PENDING',
      amountMatches,
      receiverMatches,
      currencyMatches,
      isDuplicate: status === 'DUPLICATE',
      providerConsistent: true,
      verificationFrequencyHigh: false,
      timestampAnomaly: false,
      receiptMismatch: false,
    });

    await prisma.riskAssessment.upsert({
      where: { verificationId },
      create: {
        verificationId,
        score: risk.score,
        level: risk.level,
        flags: {
          create: risk.flags.map((f) => ({
            code: f.code,
            message: f.message,
            severity: f.severity,
          })),
        },
      },
      update: {
        score: risk.score,
        level: risk.level,
      },
    });

    await prisma.verificationAttempt.create({
      data: {
        verificationId,
        attemptNumber: 1,
        status,
        provider: existing.provider,
        latencyMs: providerResult.latencyMs || Date.now() - started,
      },
    });

    assertTransition('PROCESSING', status as never);
    await prisma.verificationRequest.update({
      where: { id: verificationId },
      data: {
        status,
        verified: isSuccessfulVerification(status as never),
        actualAmount: providerResult.payment?.amount,
        actualReceiver: providerResult.payment?.receiver,
        completedAt: status === 'PENDING' ? null : new Date(),
      },
    });
  } catch (error) {
    logger.error({ err: error, verificationId }, 'Async verification failed');
    await prisma.verificationRequest.update({
      where: { id: verificationId },
      data: { status: 'FAILED', verified: false, completedAt: new Date() },
    });
  }
}

async function deliverWebhook(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });
  if (!delivery || !delivery.webhook.enabled) return;

  await assertSafeWebhookUrl(delivery.webhook.url);
  const secret = decryptSecret(delivery.webhook.secretHash);
  const body = JSON.stringify({
    id: delivery.id,
    event: delivery.event,
    created: delivery.createdAt.toISOString(),
    data: delivery.payloadJson,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(secret, timestamp, delivery.id, body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(delivery.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ice-Event': delivery.event,
        'X-Ice-Delivery-Id': delivery.id,
        'X-Ice-Timestamp': String(timestamp),
        'X-Ice-Signature': signature,
        'User-Agent': 'ICE-Verification-Webhook/1.0',
      },
      body,
      signal: controller.signal,
      redirect: 'error',
    });

    if (!response.ok) {
      throw new Error(`Webhook endpoint returned ${response.status}`);
    }

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        lastStatusCode: response.status,
        attemptCount: { increment: 1 },
      },
    });
  } catch (error) {
    const attemptCount = delivery.attemptCount + 1;
    const dead = attemptCount >= config.WEBHOOK_MAX_RETRIES;
    const delayMinutes = Math.min(60, 2 ** Math.min(attemptCount, 6));
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: dead ? 'DEAD_LETTER' : 'RETRYING',
        attemptCount,
        lastError: error instanceof Error ? error.message : 'Webhook delivery failed',
        nextRetryAt: dead ? null : new Date(Date.now() + delayMinutes * 60_000),
      },
    });
    if (!dead) {
      await enqueue(
        'webhook.deliver',
        { deliveryId: delivery.id },
        `${delivery.id}:retry:${attemptCount}`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function processProviderHealth(): Promise<void> {
  const providers = buildProviderRegistry(config);
  for (const summary of providers.list()) {
    const provider = providers.get(summary.name);
    const health = await provider.healthCheck();
    const dbProvider = await prisma.provider.findUnique({ where: { name: summary.name } });
    if (!dbProvider) continue;
    await prisma.providerHealth.create({
      data: {
        providerId: dbProvider.id,
        healthy: health.healthy,
        latencyMs: health.latencyMs,
        message: health.message,
        checkedAt: health.checkedAt,
      },
    });
  }
}

async function processJob(job: QueueJob): Promise<void> {
  switch (job.type) {
    case 'verification.process': {
      const payload = job.payload as { verificationId: string; merchantId: string };
      await processVerification(payload.verificationId, payload.merchantId);
      break;
    }
    case 'webhook.deliver': {
      const payload = job.payload as { deliveryId: string };
      await deliverWebhook(payload.deliveryId);
      break;
    }
    case 'provider.health':
      await processProviderHealth();
      break;
    default:
      logger.warn({ type: job.type }, 'Unknown job type');
  }
}

async function main() {
  let redisOk = false;
  try {
    await redis.connect();
    await redis.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  logger.info(
    { concurrency: config.WORKER_CONCURRENCY, redis: redisOk },
    redisOk ? 'ICE worker started' : 'ICE worker started (Redis unavailable — local memory queue)',
  );

  setInterval(() => {
    void enqueue('provider.health', {}, `health:${Date.now()}`);
  }, config.PROVIDER_HEALTH_INTERVAL_MS);

  while (true) {
    try {
      const job = await dequeue(5);
      if (!job) continue;
      logger.info({ jobId: job.id, type: job.type }, 'Processing job');
      await processJob(job);
    } catch (error) {
      logger.error({ err: error }, 'Worker loop error');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

main().catch(async (error) => {
  logger.error({ err: error }, 'Worker failed');
  await prisma.$disconnect();
  process.exit(1);
});
