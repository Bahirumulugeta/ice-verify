import {
  PaymentDetails,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderHealthResult,
  type ProviderVerificationRequest,
  type ProviderVerificationResult,
} from '@ice/domain';
import { AppError } from '@ice/shared';
import { verifyTelebirrReceipt } from './client.js';
import {
  isLikelyTelebirrReference,
  mapTelebirrStatus,
  normalizeTelebirrReference,
  parseBirrAmount,
  parseTelebirrDate,
} from './parse.js';
import type { TelebirrProviderOptions, TelebirrReceipt } from './types.js';

function toPaymentDetails(reference: string, receipt: TelebirrReceipt): PaymentDetails {
  const amount =
    parseBirrAmount(receipt.settledAmount) ??
    parseBirrAmount(receipt.totalPaidAmount) ??
    0;

  return new PaymentDetails({
    reference: receipt.receiptNo || reference,
    provider: 'telebirr',
    amount,
    currency: 'ETB',
    sender: receipt.payerTelebirrNo || receipt.payerName || null,
    receiver: receipt.creditedPartyAccountNo || receipt.creditedPartyName || null,
    transactionDate: parseTelebirrDate(receipt.paymentDate),
    status: mapTelebirrStatus(receipt.transactionStatus),
    providerTransactionId: receipt.receiptNo || reference,
    metadata: {
      source: 'telebirr_receipt',
      payerName: receipt.payerName,
      payerTelebirrNo: receipt.payerTelebirrNo,
      creditedPartyName: receipt.creditedPartyName,
      creditedPartyAccountNo: receipt.creditedPartyAccountNo,
      bankName: receipt.bankName,
      transactionStatus: receipt.transactionStatus,
      paymentDate: receipt.paymentDate,
      settledAmount: receipt.settledAmount,
      serviceFee: receipt.serviceFee,
      serviceFeeVAT: receipt.serviceFeeVAT,
      totalPaidAmount: receipt.totalPaidAmount,
      customerNote: receipt.customerNote,
    },
  });
}

export class TelebirrProvider implements PaymentProvider {
  constructor(private readonly options: TelebirrProviderOptions = {}) {}

  getName(): string {
    return 'telebirr';
  }

  getDisplayName(): string {
    return 'Telebirr';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: true,
      supportsReceiptVerification: true,
      supportsAsyncVerification: false,
      supportsWebhook: false,
      supportsBatchVerification: true,
      supportsTransactionSearch: true,
    };
  }

  getIntegrationStatus(): 'available' | 'pending' | 'disabled' {
    return 'available';
  }

  async verify(request: ProviderVerificationRequest): Promise<ProviderVerificationResult> {
    const started = Date.now();
    const reference = normalizeTelebirrReference(request.reference);

    if (!isLikelyTelebirrReference(reference)) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'Invalid Telebirr reference format',
      };
    }

    try {
      const receipt = await verifyTelebirrReceipt(reference, this.options);
      if (!receipt) {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: 'Telebirr receipt not found or could not be processed',
        };
      }

      const payment = toPaymentDetails(reference, receipt);
      const status = mapTelebirrStatus(receipt.transactionStatus);

      if (status === 'PENDING') {
        return {
          outcome: 'PENDING',
          payment,
          environment: 'live',
          latencyMs: Date.now() - started,
          providerStatus: receipt.transactionStatus,
          message: receipt.transactionStatus,
        };
      }

      if (status === 'FAILED') {
        return {
          outcome: 'PROVIDER_ERROR',
          payment,
          environment: 'live',
          latencyMs: Date.now() - started,
          providerStatus: receipt.transactionStatus,
          message: receipt.transactionStatus,
        };
      }

      return {
        outcome: 'FOUND',
        payment,
        environment: 'live',
        latencyMs: Date.now() - started,
        providerStatus: receipt.transactionStatus,
        message: 'Telebirr receipt verified',
      };
    } catch (error) {
      if (error instanceof AppError && error.code === 'PAYMENT_NOT_FOUND') {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: error.message,
        };
      }

      return {
        outcome: 'TIMEOUT',
        environment: 'live',
        latencyMs: Date.now() - started,
        message:
          error instanceof Error
            ? error.message
            : 'Telebirr provider unavailable',
        rawCode: 'PROVIDER_UNAVAILABLE',
      };
    }
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const started = Date.now();
    return {
      provider: this.getName(),
      healthy: true,
      latencyMs: Date.now() - started,
      message: this.options.skipPrimary
        ? 'Telebirr configured for relay-only verification'
        : 'Telebirr primary receipt verification enabled',
      checkedAt: new Date(),
    };
  }
}
