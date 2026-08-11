import type {
  CreateVerificationCommand,
  RiskAssessment,
  VerificationStatus,
  VerificationView,
} from '@ice/domain';
import type { QueueJobType } from '../infrastructure/queue/queue.js';

export interface AuthenticatedMerchant {
  merchantId: string;
  apiKeyId: string;
  environment: 'test' | 'live';
  name: string;
}

export interface VerificationRecord {
  id: string;
  merchantId: string;
  provider: string;
  reference: string;
  status: VerificationStatus;
  environment: 'test' | 'live';
  expectedAmount?: number | null;
  currency?: string | null;
  expectedReceiver?: string | null;
  actualAmount?: number | null;
  actualReceiver?: string | null;
  verified: boolean;
  metadata: Record<string, unknown>;
  requestId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  risk?: RiskAssessment | null;
}

export interface VerificationRepository {
  create(input: CreateVerificationCommand & { id: string }): Promise<VerificationRecord>;
  updateStatus(
    id: string,
    status: VerificationStatus,
    patch?: Partial<{
      verified: boolean;
      actualAmount: number | null;
      actualReceiver: string | null;
      currency: string | null;
      completedAt: Date | null;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<VerificationRecord>;
  findById(id: string, merchantId: string): Promise<VerificationRecord | null>;
  findRecentByReference(
    merchantId: string,
    provider: string,
    reference: string,
    since: Date,
  ): Promise<VerificationRecord | null>;
  addAttempt(input: {
    verificationId: string;
    attemptNumber: number;
    status: VerificationStatus;
    provider: string;
    latencyMs?: number;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void>;
  saveResult(input: {
    verificationId: string;
    outcomeStatus: VerificationStatus;
    summary: Record<string, unknown>;
  }): Promise<void>;
  savePaymentDetails(input: {
    verificationId: string;
    reference: string;
    provider: string;
    amount: number;
    currency: string;
    sender?: string | null;
    receiver?: string | null;
    transactionDate?: Date | null;
    status: string;
    providerTransactionId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  saveRisk(verificationId: string, risk: RiskAssessment): Promise<void>;
  list(input: {
    merchantId: string;
    status?: VerificationStatus;
    provider?: string;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: VerificationRecord[]; total: number }>;
  toView(record: VerificationRecord): VerificationView;
}

export interface IdempotencyRepository {
  find(merchantId: string, key: string): Promise<{
    requestHash: string;
    responseJson: unknown;
    statusCode: number;
  } | null>;
  save(input: {
    merchantId: string;
    key: string;
    requestHash: string;
    responseJson: unknown;
    statusCode: number;
    expiresAt: Date;
  }): Promise<void>;
}

export interface DuplicateRepository {
  markAndCheck(input: {
    merchantId: string;
    provider: string;
    reference: string;
    forceDuplicate?: boolean;
  }): Promise<{ isDuplicate: boolean; count: number }>;
}

export interface AuditRepository {
  write(input: {
    merchantId?: string;
    actorUserId?: string;
    actorType: string;
    action: string;
    resource: string;
    resourceId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface UsageRepository {
  track(input: {
    merchantId: string;
    metric: string;
    value?: number;
    provider?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  summarize(merchantId: string, since: Date): Promise<Record<string, number>>;
}

export interface WebhookRepository {
  list(merchantId: string): Promise<
    Array<{
      id: string;
      url: string;
      events: string[];
      enabled: boolean;
      description?: string | null;
      secretPrefix: string;
      createdAt: Date;
    }>
  >;
  create(input: {
    merchantId: string;
    url: string;
    events: string[];
    description?: string;
    secretHash: string;
    secretPrefix: string;
  }): Promise<{ id: string }>;
  delete(merchantId: string, id: string): Promise<boolean>;
  createDelivery(input: {
    id: string;
    webhookId: string;
    event: string;
    payload: unknown;
  }): Promise<void>;
  listEnabledForEvent(
    merchantId: string,
    event: string,
  ): Promise<Array<{ id: string; url: string; secretHash: string }>>;
}

export interface PaymentClaimRecord {
  id: string;
  merchantId: string;
  provider: string;
  reference: string;
  verificationId?: string | null;
  externalOrderId?: string | null;
  status: 'CLAIMED' | 'RELEASED' | 'EXPIRED';
  claimedAt: Date;
  releasedAt?: Date | null;
}

export interface PaymentClaimRepository {
  findActive(provider: string, reference: string): Promise<PaymentClaimRecord | null>;
  claim(input: {
    merchantId: string;
    provider: string;
    reference: string;
    verificationId?: string;
    externalOrderId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentClaimRecord>;
  release(merchantId: string, claimId: string, reason?: string): Promise<PaymentClaimRecord | null>;
  list(merchantId: string, limit: number): Promise<PaymentClaimRecord[]>;
}

export interface QueuePort {
  enqueue<T>(type: QueueJobType, payload: T, id: string): Promise<void>;
}

export interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  incrWithExpire(key: string, ttlSeconds: number): Promise<number>;
}
