import {
  PaymentDetails,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderHealthResult,
  type ProviderVerificationRequest,
  type ProviderVerificationResult,
} from '@ice/domain';
import { fetchJson, parseMoney } from '../shared/http.js';

interface BoaResponse {
  header?: { status?: string };
  body?: Array<Record<string, string>>;
}

export class BoaProvider implements PaymentProvider {
  getName(): string {
    return 'boa';
  }
  getDisplayName(): string {
    return 'Bank of Abyssinia';
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
    const suffix = request.accountSuffix?.trim();
    if (!suffix || suffix.length !== 5) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: 0,
        message: 'Bank of Abyssinia requires a 5-digit account suffix',
      };
    }

    const reference = request.reference.trim().toUpperCase();
    const url = `https://cs.bankofabyssinia.com/api/onlineSlip/getDetails/?id=${reference}${suffix}`;

    try {
      const { status, data } = await fetchJson<BoaResponse>(url, { timeoutMs: 30_000 });
      if (status >= 400 || data.header?.status !== 'success' || !data.body?.length) {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: 'Abyssinia receipt not found',
        };
      }

      const row = data.body[0];
      const amount =
        parseMoney(row['Transferred Amount'] || row['Total Amount including VAT']) ?? 0;
      const dateRaw = row['Transaction Date'];
      return {
        outcome: 'FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        payment: new PaymentDetails({
          reference: row['Transaction Reference'] || reference,
          provider: 'boa',
          amount,
          currency: 'ETB',
          sender: row["Payer's Name"] || row['Source Account Name'] || row['Source Account'] || null,
          receiver: row['Narrative'] || null,
          transactionDate: dateRaw ? new Date(dateRaw) : null,
          status: 'COMPLETED',
          providerTransactionId: row['Payment Reference'] || reference,
          metadata: {
            payerName: row["Payer's Name"] || row['Source Account Name'] || null,
            narrative: row['Narrative'] || null,
            serviceCharge: row['Service Charge'] || null,
            source: 'boa_json',
          },
        }),
      };
    } catch {
      return {
        outcome: 'TIMEOUT',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'Bank of Abyssinia verification unavailable',
      };
    }
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      provider: this.getName(),
      healthy: true,
      latencyMs: 0,
      message: 'BOA online slip verification enabled',
      checkedAt: new Date(),
    };
  }
}
