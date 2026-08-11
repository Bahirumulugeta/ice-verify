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

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `251${digits.slice(1)}`;
  if (digits.length === 9) return `251${digits}`;
  return digits;
}

function extract(text: string, pattern: RegExp): string {
  return (text.match(pattern)?.[1] ?? '').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export class CbeBirrProvider implements PaymentProvider {
  getName(): string {
    return 'cbebirr';
  }
  getDisplayName(): string {
    return 'CBE Birr';
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
    if (!request.phoneNumber) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: 0,
        message: 'CBE Birr requires phoneNumber',
      };
    }

    const receiptNumber = request.reference.trim();
    const phone = normalizePhone(request.phoneNumber);
    const url = `https://cbepay1.cbe.com.et/aureceipt?TID=${encodeURIComponent(receiptNumber)}&PH=${encodeURIComponent(phone)}`;

    try {
      const response = await fetchBuffer(url, {
        timeoutMs: 30_000,
        headers: { Accept: 'application/pdf' },
      });
      if (response.status >= 400 || response.buffer.byteLength < 100) {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: 'CBE Birr receipt not found',
        };
      }

      const parsed = await pdf(Buffer.from(response.buffer));
      const text = parsed.text;
      const amount =
        parseMoney(extract(text, /Paid Amount\s*([\d,]+\.?\d*)/i)) ??
        parseMoney(extract(text, /Total Paid Amount\s*([\d,]+\.?\d*)/i)) ??
        parseMoney(extract(text, /Amount\s*([\d,]+\.?\d*)/i));
      const customerName = extract(text, /Sub city:[\s\n]+([A-Z\s]+?)[\s\n]+Wereda\/kebele:/i);
      const receiverName = extract(text, /Receiver Name\s*([\s\S]*?)(?=\s*Order Id|\s*Transaction)/i);
      const statusText = extract(text, /Transaction Status\s*([A-Za-z]+)/i) || 'Completed';

      if (!amount) {
        return {
          outcome: 'NOT_FOUND',
          environment: 'live',
          latencyMs: Date.now() - started,
          message: 'Could not parse CBE Birr receipt',
        };
      }

      return {
        outcome: 'FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        payment: new PaymentDetails({
          reference: receiptNumber,
          provider: 'cbebirr',
          amount,
          currency: 'ETB',
          sender: customerName || phone,
          receiver: receiverName || null,
          status: statusText.toLowerCase().includes('complete') ? 'COMPLETED' : 'UNKNOWN',
          providerTransactionId: receiptNumber,
          metadata: {
            payerName: customerName || null,
            creditedPartyName: receiverName || null,
            phone,
            transactionStatus: statusText,
            source: 'cbebirr_pdf',
          },
        }),
      };
    } catch {
      return {
        outcome: 'TIMEOUT',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'CBE Birr verification unavailable',
      };
    }
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      provider: this.getName(),
      healthy: true,
      latencyMs: 0,
      message: 'CBE Birr PDF verification enabled',
      checkedAt: new Date(),
    };
  }
}
