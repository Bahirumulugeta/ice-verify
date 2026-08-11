import {
  PaymentDetails,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderHealthResult,
  type ProviderVerificationRequest,
  type ProviderVerificationResult,
} from '@ice/domain';
import pdf from 'pdf-parse';
import { fetchBuffer, parseMoney } from '../shared/http.js';

function extract(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim();
}

export class DashenProvider implements PaymentProvider {
  getName(): string {
    return 'dashen';
  }
  getDisplayName(): string {
    return 'Dashen Bank';
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
    const reference = request.reference.trim();
    if (!(reference.length === 16 && /^\d{3}/.test(reference))) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: 0,
        message: 'Dashen references are 16 characters starting with 3 digits',
      };
    }

    const url = `https://receipt.dashensuperapp.com/receipt/${reference}`;
    try {
      const response = await fetchBuffer(url, {
        timeoutMs: 60_000,
        insecureTls: true,
        headers: { Accept: 'application/pdf' },
      });
      if (response.status >= 400 || response.buffer.byteLength < 100) {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: 'Dashen receipt not found',
        };
      }

      const parsed = await pdf(Buffer.from(response.buffer));
      const text = parsed.text.replace(/\s+/g, ' ').trim();
      const amount =
        parseMoney(extract(text, /Transaction Amount\s*:?\s*([\d,]+\.?\d*)/i)) ??
        parseMoney(extract(text, /Total\s*:?\s*([\d,]+\.?\d*)/i));
      const senderName = extract(text, /Sender Name\s*:?\s*(.+?)(?:\s+Sender Account|\s+Transaction)/i);
      const receiverName = extract(text, /Receiver Name\s*:?\s*(.+?)(?:\s+Phone|\s+Institution)/i);
      const txnRef =
        extract(text, /Transaction Reference\s*:?\s*([A-Z0-9]+)/i) || reference;

      if (!amount) {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: 'Could not parse Dashen receipt',
        };
      }

      return {
        outcome: 'FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        payment: new PaymentDetails({
          reference: txnRef,
          provider: 'dashen',
          amount,
          currency: 'ETB',
          sender: senderName || null,
          receiver: receiverName || null,
          status: 'COMPLETED',
          providerTransactionId: txnRef,
          metadata: {
            payerName: senderName || null,
            creditedPartyName: receiverName || null,
            source: 'dashen_pdf',
          },
        }),
      };
    } catch {
      return {
        outcome: 'TIMEOUT',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'Dashen verification unavailable',
      };
    }
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      provider: this.getName(),
      healthy: true,
      latencyMs: 0,
      message: 'Dashen PDF receipt verification enabled',
      checkedAt: new Date(),
    };
  }
}
