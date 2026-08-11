import {
  RiskEngine,
  assertTransition,
  isSuccessfulVerification,
  mapProviderOutcomeToStatus,
  type CreateVerificationCommand,
  type ProviderRegistry,
  type VerificationStatus,
  type VerificationView,
} from '@ice/domain';
import { resolveProviderName } from '@ice/providers';
import { AppError, createVerificationId, addHours, createDeliveryId } from '@ice/shared';
import type {
  AuditRepository,
  CachePort,
  DuplicateRepository,
  PaymentClaimRepository,
  QueuePort,
  UsageRepository,
  VerificationRepository,
  WebhookRepository,
} from '../ports.js';

export interface CreateVerificationDeps {
  providers: ProviderRegistry;
  verifications: VerificationRepository;
  duplicates: DuplicateRepository;
  claims: PaymentClaimRepository;
  audits: AuditRepository;
  usage: UsageRepository;
  webhooks: WebhookRepository;
  queue: QueuePort;
  cache: CachePort;
  riskEngine: RiskEngine;
  cacheTtlSeconds: number;
  duplicateWindowHours: number;
}

function normalizeReceiver(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, '').toLowerCase();
}

export class CreateVerificationUseCase {
  constructor(private readonly deps: CreateVerificationDeps) {}

  async execute(command: CreateVerificationCommand): Promise<VerificationView> {
    let providerName: string;
    try {
      const demo = this.deps.providers.detect(command.reference);
      providerName = demo?.getName() ??
        resolveProviderName({
          provider: command.provider,
          reference: command.reference,
          accountSuffix: command.accountSuffix,
          phoneNumber: command.phoneNumber,
        });
    } catch {
      throw new AppError(
        'INVALID_REQUEST',
        'Unable to detect provider. Pass provider explicitly (telebirr, cbe, boa, dashen, cbebirr).',
        400,
      );
    }

    const selectedProvider = this.deps.providers.get(providerName);

    if (selectedProvider.getIntegrationStatus() !== 'available' && !command.async) {
      throw new AppError(
        'PROVIDER_UNAVAILABLE',
        `${selectedProvider.getDisplayName()} integration is not available yet`,
        503,
        { provider: selectedProvider.getName(), integrationStatus: 'pending' },
      );
    }

    if (command.rejectIfClaimed !== false) {
      const activeClaim = await this.deps.claims.findActive(
        selectedProvider.getName(),
        command.reference,
      );
      if (activeClaim && activeClaim.merchantId !== command.merchantId) {
        throw new AppError(
          'PAYMENT_ALREADY_CLAIMED',
          'This payment was already claimed and cannot be reused',
          409,
          {
            provider: selectedProvider.getName(),
            reference: command.reference,
            claimedAt: activeClaim.claimedAt.toISOString(),
          },
        );
      }
    }

    const cacheKey = `ver:cache:${command.merchantId}:${selectedProvider.getName()}:${command.reference}:${command.accountSuffix ?? ''}:${command.phoneNumber ?? ''}:${command.expectedAmount ?? ''}:${command.expectedReceiver ?? ''}`;
    const cached = await this.deps.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as VerificationView;
    }

    const verificationId = createVerificationId();
    const record = await this.deps.verifications.create({
      ...command,
      provider: selectedProvider.getName(),
      metadata: {
        ...(command.metadata ?? {}),
        accountSuffix: command.accountSuffix,
        phoneNumber: command.phoneNumber,
      },
      id: verificationId,
    });

    await this.deps.audits.write({
      merchantId: command.merchantId,
      actorType: 'api_key',
      action: 'verification.requested',
      resource: 'verification',
      resourceId: verificationId,
      requestId: command.requestId,
      metadata: { provider: selectedProvider.getName(), reference: command.reference },
    });

    await this.deps.usage.track({
      merchantId: command.merchantId,
      metric: 'verification_requests',
      provider: selectedProvider.getName(),
    });

    await this.publishWebhook(command.merchantId, 'verification.created', {
      verificationId,
      status: 'CREATED',
      provider: selectedProvider.getName(),
      reference: command.reference,
    });

    if (command.async) {
      assertTransition(record.status, 'PROCESSING');
      await this.deps.verifications.updateStatus(verificationId, 'PROCESSING');
      await this.deps.queue.enqueue(
        'verification.process',
        { verificationId, merchantId: command.merchantId },
        verificationId,
      );
      await this.publishWebhook(command.merchantId, 'verification.processing', {
        verificationId,
        status: 'PROCESSING',
      });
      return this.deps.verifications.toView(
        (await this.deps.verifications.findById(verificationId, command.merchantId))!,
      );
    }

    const view = await this.process(verificationId, command.merchantId);

    if (view.verified) {
      await this.deps.cache.set(cacheKey, JSON.stringify(view), this.deps.cacheTtlSeconds);
    }

    if (command.autoClaim && view.verified) {
      const claim = await this.deps.claims.claim({
        merchantId: command.merchantId,
        provider: view.provider,
        reference: view.reference,
        verificationId: view.verificationId,
        externalOrderId: command.externalOrderId,
        metadata: { source: 'auto_claim', requestId: command.requestId },
      });
      await this.deps.audits.write({
        merchantId: command.merchantId,
        actorType: 'api_key',
        action: 'payment.claimed',
        resource: 'payment_claim',
        resourceId: claim.id,
        requestId: command.requestId,
        metadata: { provider: view.provider, reference: view.reference, autoClaim: true },
      });
      const claimedView: VerificationView = {
        ...view,
        claimed: true,
        claimId: claim.id,
      };
      return claimedView;
    }

    return view;
  }

  async process(verificationId: string, merchantId: string): Promise<VerificationView> {
    const existing = await this.deps.verifications.findById(verificationId, merchantId);
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Verification not found', 404);
    }

    assertTransition(existing.status === 'CREATED' ? 'CREATED' : existing.status, 'PROCESSING');
    await this.deps.verifications.updateStatus(verificationId, 'PROCESSING');

    const provider = this.deps.providers.get(existing.provider);
    const started = Date.now();

    try {
      const providerResult = await provider.verify({
        reference: existing.reference,
        accountSuffix: (existing.metadata.accountSuffix as string | undefined) ?? undefined,
        phoneNumber: (existing.metadata.phoneNumber as string | undefined) ?? undefined,
        expectedAmount: existing.expectedAmount ?? undefined,
        currency: existing.currency ?? undefined,
        expectedReceiver: existing.expectedReceiver ?? undefined,
        metadata: existing.metadata,
      });

      const forceDuplicate = Boolean(providerResult.payment?.metadata?.forceDuplicate);
      const duplicate = await this.deps.duplicates.markAndCheck({
        merchantId,
        provider: existing.provider,
        reference: existing.reference,
        forceDuplicate,
      });

      let status: VerificationStatus = mapProviderOutcomeToStatus(providerResult.outcome);
      let actualAmount: number | null = providerResult.payment?.amount ?? null;
      let actualReceiver: string | null = providerResult.payment?.receiver ?? null;
      let amountMatches = true;
      let receiverMatches = true;
      let currencyMatches = true;

      if (providerResult.outcome === 'FOUND' && providerResult.payment) {
        await this.deps.verifications.savePaymentDetails({
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
          metadata: {
            ...providerResult.payment.metadata,
            environment: providerResult.environment,
          },
        });

        if (existing.expectedAmount != null) {
          amountMatches = providerResult.payment.money.matchesAmount(existing.expectedAmount);
          if (!amountMatches) status = 'AMOUNT_MISMATCH';
        }

        if (existing.currency) {
          currencyMatches = providerResult.payment.money.matchesCurrency(existing.currency);
          if (!currencyMatches && status === 'VERIFIED') status = 'FAILED';
        }

        if (existing.expectedReceiver) {
          receiverMatches =
            normalizeReceiver(existing.expectedReceiver) ===
            normalizeReceiver(providerResult.payment.receiver);
          if (!receiverMatches) status = 'RECEIVER_MISMATCH';
        }

        if (providerResult.payment.status === 'PENDING') {
          status = 'PENDING';
        }
      }

      // Lookup-only requests (no expected amount/receiver) return payment details.
      // Duplicate blocking applies in fulfillment mode when expectations are provided.
      const isFulfillmentCheck =
        existing.expectedAmount != null || Boolean(existing.expectedReceiver);
      const isDuplicateHit = forceDuplicate || duplicate.isDuplicate;
      if (forceDuplicate || (isDuplicateHit && isFulfillmentCheck)) {
        status = 'DUPLICATE';
      }

      const risk = this.deps.riskEngine.evaluate({
        paymentExists: providerResult.outcome === 'FOUND' || providerResult.outcome === 'PENDING',
        amountMatches,
        receiverMatches,
        currencyMatches,
        isDuplicate: isDuplicateHit,
        providerConsistent: providerResult.payment?.provider === existing.provider || !providerResult.payment,
        verificationFrequencyHigh: false,
        timestampAnomaly: false,
        receiptMismatch: false,
      });

      await this.deps.verifications.saveRisk(verificationId, risk);
      await this.deps.verifications.addAttempt({
        verificationId,
        attemptNumber: 1,
        status,
        provider: existing.provider,
        latencyMs: providerResult.latencyMs || Date.now() - started,
        errorCode: status === 'VERIFIED' ? undefined : status,
        errorMessage: providerResult.message,
      });

      assertTransition('PROCESSING', status);
      const updated = await this.deps.verifications.updateStatus(verificationId, status, {
        verified: isSuccessfulVerification(status),
        actualAmount,
        actualReceiver,
        currency: existing.currency ?? providerResult.payment?.currency ?? null,
        completedAt: status === 'PENDING' ? null : new Date(),
        metadata: {
          ...existing.metadata,
          providerEnvironment: providerResult.environment,
          providerMessage: providerResult.message,
          payment: providerResult.payment
            ? {
                sender: providerResult.payment.sender,
                receiver: providerResult.payment.receiver,
                transactionDate: providerResult.payment.transactionDate?.toISOString() ?? null,
                providerStatus: providerResult.payment.status,
                payerName: providerResult.payment.metadata.payerName ?? null,
                creditedPartyName: providerResult.payment.metadata.creditedPartyName ?? null,
                serviceFee: providerResult.payment.metadata.serviceFee ?? null,
                totalPaidAmount: providerResult.payment.metadata.totalPaidAmount ?? null,
                bankName: providerResult.payment.metadata.bankName ?? null,
              }
            : undefined,
        },
      });

      await this.deps.verifications.saveResult({
        verificationId,
        outcomeStatus: status,
        summary: {
          status,
          verified: isSuccessfulVerification(status),
          risk,
          providerEnvironment: providerResult.environment,
        },
      });

      await this.deps.usage.track({
        merchantId,
        metric: isSuccessfulVerification(status) ? 'verification_success' : 'verification_failure',
        provider: existing.provider,
      });

      await this.deps.audits.write({
        merchantId,
        actorType: 'system',
        action: 'verification.completed',
        resource: 'verification',
        resourceId: verificationId,
        metadata: { status, riskLevel: risk.level },
      });

      const event =
        status === 'FAILED' || status === 'PROVIDER_UNAVAILABLE'
          ? 'verification.failed'
          : 'verification.completed';
      await this.publishWebhook(merchantId, event, {
        verificationId,
        status,
        verified: isSuccessfulVerification(status),
        risk,
      });

      if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
        await this.publishWebhook(merchantId, 'verification.risk_detected', {
          verificationId,
          risk,
        });
      }

      return this.deps.verifications.toView(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provider verification failed';
      const status: VerificationStatus =
        error instanceof AppError && error.code === 'PROVIDER_UNAVAILABLE'
          ? 'PROVIDER_UNAVAILABLE'
          : 'FAILED';

      await this.deps.verifications.addAttempt({
        verificationId,
        attemptNumber: 1,
        status,
        provider: existing.provider,
        latencyMs: Date.now() - started,
        errorCode: status,
        errorMessage: message,
      });

      assertTransition('PROCESSING', status);
      const updated = await this.deps.verifications.updateStatus(verificationId, status, {
        verified: false,
        completedAt: new Date(),
        metadata: {
          ...existing.metadata,
          providerMessage: message,
        },
      });

      await this.publishWebhook(merchantId, 'verification.failed', {
        verificationId,
        status,
        message,
      });

      return this.deps.verifications.toView(updated);
    }
  }

  private async publishWebhook(
    merchantId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.deps.webhooks.listEnabledForEvent(merchantId, event);
    for (const endpoint of endpoints) {
      const deliveryId = createDeliveryId();
      await this.deps.webhooks.createDelivery({
        id: deliveryId,
        webhookId: endpoint.id,
        event,
        payload,
      });
      await this.deps.queue.enqueue(
        'webhook.deliver',
        { deliveryId, webhookId: endpoint.id },
        deliveryId,
      );
    }
  }
}

export function duplicateWindowSince(hours: number): Date {
  return addHours(new Date(), -hours);
}
