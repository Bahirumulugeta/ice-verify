import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '@ice/shared';
import type { PaymentClaimRecord, PaymentClaimRepository } from '../../../application/ports.js';

function mapClaim(row: {
  id: string;
  merchantId: string;
  provider: string;
  reference: string;
  verificationId: string | null;
  externalOrderId: string | null;
  status: 'CLAIMED' | 'RELEASED' | 'EXPIRED';
  claimedAt: Date;
  releasedAt: Date | null;
}): PaymentClaimRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    provider: row.provider,
    reference: row.reference,
    verificationId: row.verificationId,
    externalOrderId: row.externalOrderId,
    status: row.status,
    claimedAt: row.claimedAt,
    releasedAt: row.releasedAt,
  };
}

export class PrismaPaymentClaimRepository implements PaymentClaimRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive(provider: string, reference: string): Promise<PaymentClaimRecord | null> {
    const row = await this.prisma.paymentClaim.findFirst({
      where: {
        provider: provider.toLowerCase(),
        reference,
        status: 'CLAIMED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return row ? mapClaim(row) : null;
  }

  async claim(input: {
    merchantId: string;
    provider: string;
    reference: string;
    verificationId?: string;
    externalOrderId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentClaimRecord> {
    const existing = await this.prisma.paymentClaim.findUnique({
      where: {
        provider_reference: {
          provider: input.provider.toLowerCase(),
          reference: input.reference,
        },
      },
    });

    if (existing && existing.status === 'CLAIMED') {
      if (existing.merchantId !== input.merchantId) {
        throw new AppError(
          'PAYMENT_ALREADY_CLAIMED',
          'This payment was already claimed by another merchant',
          409,
          {
            provider: input.provider,
            reference: input.reference,
            claimedAt: existing.claimedAt.toISOString(),
          },
        );
      }
      return mapClaim(existing);
    }

    if (existing) {
      const updated = await this.prisma.paymentClaim.update({
        where: { id: existing.id },
        data: {
          merchantId: input.merchantId,
          status: 'CLAIMED',
          verificationId: input.verificationId,
          externalOrderId: input.externalOrderId,
          claimedAt: new Date(),
          releasedAt: null,
          metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      return mapClaim(updated);
    }

    try {
      const created = await this.prisma.paymentClaim.create({
        data: {
          merchantId: input.merchantId,
          provider: input.provider.toLowerCase(),
          reference: input.reference,
          verificationId: input.verificationId,
          externalOrderId: input.externalOrderId,
          status: 'CLAIMED',
          metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      return mapClaim(created);
    } catch {
      throw new AppError(
        'PAYMENT_ALREADY_CLAIMED',
        'This payment was already claimed',
        409,
        { provider: input.provider, reference: input.reference },
      );
    }
  }

  async release(
    merchantId: string,
    claimId: string,
    reason?: string,
  ): Promise<PaymentClaimRecord | null> {
    const existing = await this.prisma.paymentClaim.findFirst({
      where: { id: claimId, merchantId },
    });
    if (!existing) return null;
    const updated = await this.prisma.paymentClaim.update({
      where: { id: claimId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        metadataJson: {
          ...((existing.metadataJson as object) ?? {}),
          releaseReason: reason ?? null,
        },
      },
    });
    return mapClaim(updated);
  }

  async list(merchantId: string, limit: number): Promise<PaymentClaimRecord[]> {
    const rows = await this.prisma.paymentClaim.findMany({
      where: { merchantId },
      orderBy: { claimedAt: 'desc' },
      take: limit,
    });
    return rows.map(mapClaim);
  }
}
