import type { Prisma, PrismaClient, VerificationStatus as PrismaStatus } from '@prisma/client';
import {
  toApiStatus,
  type CreateVerificationCommand,
  type RiskAssessment,
  type VerificationStatus,
  type VerificationView,
} from '@ice/domain';
import type { VerificationRecord, VerificationRepository } from '../../../application/ports.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNumber(value: { toNumber(): number } | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

function mapRecord(
  row: {
    id: string;
    merchantId: string;
    provider: string;
    reference: string;
    status: PrismaStatus;
    environment: 'test' | 'live';
    expectedAmount: { toNumber(): number } | null;
    currency: string | null;
    expectedReceiver: string | null;
    actualAmount: { toNumber(): number } | null;
    actualReceiver: string | null;
    verified: boolean;
    metadataJson: unknown;
    requestId: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    riskAssessment?: {
      score: number;
      level: RiskAssessment['level'];
      flags: Array<{ code: string; message: string; severity: RiskAssessment['level'] }>;
    } | null;
    paymentDetails?: {
      amount: { toNumber(): number } | number;
      currency: string;
      sender: string | null;
      receiver: string | null;
      transactionDate: Date | null;
      status: string;
      metadataJson: unknown;
    } | null;
  },
): VerificationRecord {
  const paymentMeta = (row.paymentDetails?.metadataJson as Record<string, unknown>) ?? {};
  return {
    id: row.id,
    merchantId: row.merchantId,
    provider: row.provider,
    reference: row.reference,
    status: row.status as VerificationStatus,
    environment: row.environment,
    expectedAmount: toNumber(row.expectedAmount),
    currency: row.currency ?? row.paymentDetails?.currency ?? null,
    expectedReceiver: row.expectedReceiver,
    actualAmount: toNumber(row.actualAmount) ?? toNumber(row.paymentDetails?.amount ?? null),
    actualReceiver: row.actualReceiver ?? row.paymentDetails?.receiver ?? null,
    verified: row.verified,
    metadata: {
      ...((row.metadataJson as Record<string, unknown>) ?? {}),
      payment: row.paymentDetails
        ? {
            sender: row.paymentDetails.sender,
            receiver: row.paymentDetails.receiver,
            transactionDate: row.paymentDetails.transactionDate?.toISOString() ?? null,
            providerStatus: row.paymentDetails.status,
            payerName: paymentMeta.payerName ?? null,
            creditedPartyName: paymentMeta.creditedPartyName ?? null,
            serviceFee: paymentMeta.serviceFee ?? null,
            totalPaidAmount: paymentMeta.totalPaidAmount ?? null,
            bankName: paymentMeta.bankName ?? null,
          }
        : undefined,
    },
    requestId: row.requestId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    risk: row.riskAssessment
      ? {
          score: row.riskAssessment.score,
          level: row.riskAssessment.level,
          flags: row.riskAssessment.flags,
        }
      : null,
  };
}

export class PrismaVerificationRepository implements VerificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateVerificationCommand & { id: string }): Promise<VerificationRecord> {
    const provider = input.provider;
    if (!provider) {
      throw new Error('Verification create requires a resolved provider name');
    }
    const row = await this.prisma.verificationRequest.create({
      data: {
        id: input.id,
        merchantId: input.merchantId,
        provider: provider.toLowerCase(),
        reference: input.reference,
        status: 'CREATED',
        environment: input.environment,
        expectedAmount: input.expectedAmount,
        currency: input.currency?.toUpperCase(),
        expectedReceiver: input.expectedReceiver,
        metadataJson: asJson(input.metadata ?? {}),
        requestId: input.requestId,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return mapRecord(row);
  }

  async updateStatus(
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
  ): Promise<VerificationRecord> {
    const row = await this.prisma.verificationRequest.update({
      where: { id },
      data: {
        status: status as PrismaStatus,
        verified: patch?.verified,
        actualAmount: patch?.actualAmount,
        actualReceiver: patch?.actualReceiver,
        currency: patch?.currency ?? undefined,
        completedAt: patch?.completedAt,
        metadataJson: patch?.metadata !== undefined ? asJson(patch.metadata) : undefined,
      },
      include: {
        riskAssessment: { include: { flags: true } },
        paymentDetails: true,
      },
    });
    return mapRecord(row);
  }

  async findById(id: string, merchantId: string): Promise<VerificationRecord | null> {
    const row = await this.prisma.verificationRequest.findFirst({
      where: { id, merchantId },
      include: {
        riskAssessment: { include: { flags: true } },
        paymentDetails: true,
      },
    });
    return row ? mapRecord(row) : null;
  }

  async findRecentByReference(
    merchantId: string,
    provider: string,
    reference: string,
    since: Date,
  ): Promise<VerificationRecord | null> {
    const row = await this.prisma.verificationRequest.findFirst({
      where: {
        merchantId,
        provider,
        reference,
        createdAt: { gte: since },
        status: { in: ['VERIFIED', 'DUPLICATE', 'AMOUNT_MISMATCH', 'RECEIVER_MISMATCH'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { riskAssessment: { include: { flags: true } } },
    });
    return row ? mapRecord(row) : null;
  }

  async addAttempt(input: {
    verificationId: string;
    attemptNumber: number;
    status: VerificationStatus;
    provider: string;
    latencyMs?: number;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void> {
    await this.prisma.verificationAttempt.create({
      data: {
        verificationId: input.verificationId,
        attemptNumber: input.attemptNumber,
        status: input.status as PrismaStatus,
        provider: input.provider,
        latencyMs: input.latencyMs,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      },
    });
  }

  async saveResult(input: {
    verificationId: string;
    outcomeStatus: VerificationStatus;
    summary: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.verificationResult.upsert({
      where: { verificationId: input.verificationId },
      create: {
        verificationId: input.verificationId,
        outcomeStatus: input.outcomeStatus as PrismaStatus,
        summaryJson: asJson(input.summary),
      },
      update: {
        outcomeStatus: input.outcomeStatus as PrismaStatus,
        summaryJson: asJson(input.summary),
      },
    });
  }

  async savePaymentDetails(input: {
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
  }): Promise<void> {
    await this.prisma.paymentDetails.upsert({
      where: { verificationId: input.verificationId },
      create: {
        verificationId: input.verificationId,
        reference: input.reference,
        provider: input.provider,
        amount: input.amount,
        currency: input.currency,
        sender: input.sender,
        receiver: input.receiver,
        transactionDate: input.transactionDate,
        status: input.status,
        providerTransactionId: input.providerTransactionId,
        metadataJson: asJson(input.metadata ?? {}),
      },
      update: {
        amount: input.amount,
        currency: input.currency,
        sender: input.sender,
        receiver: input.receiver,
        transactionDate: input.transactionDate,
        status: input.status,
        providerTransactionId: input.providerTransactionId,
        metadataJson: asJson(input.metadata ?? {}),
      },
    });
  }

  async saveRisk(verificationId: string, risk: RiskAssessment): Promise<void> {
    await this.prisma.riskAssessment.upsert({
      where: { verificationId },
      create: {
        verificationId,
        score: risk.score,
        level: risk.level,
        flags: {
          create: risk.flags.map((flag) => ({
            code: flag.code,
            message: flag.message,
            severity: flag.severity,
          })),
        },
      },
      update: {
        score: risk.score,
        level: risk.level,
        flags: {
          deleteMany: {},
          create: risk.flags.map((flag) => ({
            code: flag.code,
            message: flag.message,
            severity: flag.severity,
          })),
        },
      },
    });
  }

  async list(input: {
    merchantId: string;
    status?: VerificationStatus;
    provider?: string;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: VerificationRecord[]; total: number }> {
    const where = {
      merchantId: input.merchantId,
      ...(input.status ? { status: input.status as PrismaStatus } : {}),
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.search
        ? {
            OR: [
              { reference: { contains: input.search, mode: 'insensitive' as const } },
              { id: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
        include: {
          riskAssessment: { include: { flags: true } },
          paymentDetails: true,
        },
      }),
      this.prisma.verificationRequest.count({ where }),
    ]);

    return { items: rows.map(mapRecord), total };
  }

  toView(record: VerificationRecord): VerificationView {
    const environment =
      record.provider === 'demo'
        ? 'demo'
        : record.environment === 'live'
          ? 'live'
          : 'test';
    const paymentMeta = (record.metadata.payment as Record<string, unknown> | undefined) ?? {};

    return {
      verificationId: record.id,
      status: record.status,
      verified: record.verified,
      provider: record.provider,
      reference: record.reference,
      amount: record.actualAmount ?? record.expectedAmount ?? undefined,
      currency: record.currency ?? undefined,
      expectedAmount: record.expectedAmount ?? undefined,
      actualAmount: record.actualAmount ?? undefined,
      expectedReceiver: record.expectedReceiver ?? undefined,
      actualReceiver: record.actualReceiver ?? undefined,
      receiverMatched:
        record.expectedReceiver && record.actualReceiver
          ? record.expectedReceiver.replace(/\s+/g, '').toLowerCase() ===
            record.actualReceiver.replace(/\s+/g, '').toLowerCase()
          : undefined,
      payment: {
        amount: record.actualAmount ?? undefined,
        currency: record.currency ?? undefined,
        sender: (paymentMeta.sender as string | null | undefined) ?? null,
        receiver:
          record.actualReceiver ?? (paymentMeta.receiver as string | null | undefined) ?? null,
        payerName: (paymentMeta.payerName as string | null | undefined) ?? null,
        creditedPartyName: (paymentMeta.creditedPartyName as string | null | undefined) ?? null,
        transactionDate: (paymentMeta.transactionDate as string | null | undefined) ?? null,
        providerStatus: (paymentMeta.providerStatus as string | null | undefined) ?? null,
        serviceFee: (paymentMeta.serviceFee as string | null | undefined) ?? null,
        totalPaidAmount: (paymentMeta.totalPaidAmount as string | null | undefined) ?? null,
        bankName: (paymentMeta.bankName as string | null | undefined) ?? null,
      },
      risk: record.risk ?? undefined,
      environment,
      message: (record.metadata.providerMessage as string | undefined) ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      completedAt: record.completedAt?.toISOString(),
    };
  }
}

export function serializeVerificationView(view: VerificationView) {
  return {
    verificationId: view.verificationId,
    status: toApiStatus(view.status),
    verified: view.verified,
    provider: view.provider,
    reference: view.reference,
    amount: view.amount,
    currency: view.currency,
    expectedAmount: view.expectedAmount,
    actualAmount: view.actualAmount,
    expectedReceiver: view.expectedReceiver,
    actualReceiver: view.actualReceiver,
    receiverMatched: view.receiverMatched,
    payment: view.payment,
    risk: view.risk,
    environment: view.environment,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    completedAt: view.completedAt,
    claimed: view.claimed,
    claimId: view.claimId,
    message: view.message,
  };
}
