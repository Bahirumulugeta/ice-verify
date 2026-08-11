import {
  PaymentDetails,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderHealthResult,
  type ProviderVerificationRequest,
  type ProviderVerificationResult,
} from '@ice/domain';
import pdf from 'pdf-parse';
import { extractLegacyCbeUrlData, extractNewCbeToken } from '../detect.js';
import { fetchBuffer, fetchJson, parseMoney } from '../shared/http.js';

interface CbeJsonReceipt {
  id?: string;
  debitAccountHolder?: string;
  debitAccountNo?: string;
  creditAccountHolder?: string;
  creditAccountNo?: string;
  amountCredited?: string;
  dateTimes?: string[];
  paymentDetails?: string[];
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

async function verifyCbeNew(token: string): Promise<ProviderVerificationResult> {
  const started = Date.now();
  const url = `https://mb.cbe.com.et/api/v1/transactions/public/transaction-detail/${token}`;
  try {
    const { status, data } = await fetchJson<CbeJsonReceipt>(url, {
      timeoutMs: 15_000,
      headers: {
        Origin: 'https://mbreciept.cbe.com.et',
        Referer: 'https://mbreciept.cbe.com.et/',
        'x-app-id': process.env.CBE_APP_ID || 'd1292e42-7400-49de-a2d3-9731caa4c819',
        'x-app-version': process.env.CBE_APP_VERSION || '0a01980b-9859-1369-8198-59f403820000',
      },
    });
    if (status === 404) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'Invalid or expired CBE receipt token',
      };
    }
    if (status >= 400 || !data.amountCredited) {
      return {
        outcome: 'TIMEOUT',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'CBE receipt service temporarily unavailable',
      };
    }

    const amount = parseMoney(data.amountCredited) ?? 0;
    return {
      outcome: 'FOUND',
      environment: 'live',
      latencyMs: Date.now() - started,
      payment: new PaymentDetails({
        reference: data.id || token,
        provider: 'cbe',
        amount,
        currency: 'ETB',
        sender: data.debitAccountNo || data.debitAccountHolder || null,
        receiver: data.creditAccountNo || data.creditAccountHolder || null,
        transactionDate: data.dateTimes?.[0] ? new Date(data.dateTimes[0]) : null,
        status: 'COMPLETED',
        providerTransactionId: data.id || token,
        metadata: {
          payerName: data.debitAccountHolder,
          creditedPartyName: data.creditAccountHolder,
          reason: data.paymentDetails?.join(' ') ?? null,
          source: 'cbe_json',
        },
      }),
    };
  } catch {
    return {
      outcome: 'TIMEOUT',
      environment: 'live',
      latencyMs: Date.now() - started,
      message: 'CBE receipt service temporarily unavailable',
    };
  }
}

async function verifyCbeLegacy(
  reference: string,
  suffix: string,
): Promise<ProviderVerificationResult> {
  const started = Date.now();
  const fullId = `${reference}${suffix}`;
  const url = `https://apps.cbe.com.et:100/?id=${fullId}`;
  try {
    const response = await fetchBuffer(url, {
      timeoutMs: 30_000,
      insecureTls: true,
      headers: { Accept: 'application/pdf' },
    });
    if (response.status >= 400 || response.buffer.byteLength < 100) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'CBE receipt not found',
      };
    }

    const parsed = await pdf(Buffer.from(response.buffer));
    const rawText = parsed.text.replace(/\s+/g, ' ').trim();
    const payerName = rawText.match(/Payer\s*:?\s*(.*?)\s+Account/i)?.[1]?.trim();
    const receiverName = rawText.match(/Receiver\s*:?\s*(.*?)\s+Account/i)?.[1]?.trim();
    const accounts = [...rawText.matchAll(/Account\s*:?\s*([A-Z0-9]?\*{4}\d{4})/gi)];
    const amountText = rawText.match(/Transferred Amount\s*:?\s*([\d,]+\.\d{2})\s*ETB/i)?.[1];
    const referenceMatch = rawText
      .match(/Reference No\.?\s*\(VAT Invoice No\)\s*:?\s*([A-Z0-9]+)/i)?.[1]
      ?.trim();
    const amount = parseMoney(amountText);
    if (!amount || !referenceMatch) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: Date.now() - started,
        message: 'Could not extract CBE receipt fields',
      };
    }

    return {
      outcome: 'FOUND',
      environment: 'live',
      latencyMs: Date.now() - started,
      payment: new PaymentDetails({
        reference: referenceMatch,
        provider: 'cbe',
        amount,
        currency: 'ETB',
        sender: accounts[0]?.[1] || payerName || null,
        receiver: accounts[1]?.[1] || receiverName || null,
        status: 'COMPLETED',
        providerTransactionId: referenceMatch,
        metadata: {
          payerName: payerName ? titleCase(payerName) : null,
          creditedPartyName: receiverName ? titleCase(receiverName) : null,
          source: 'cbe_pdf',
        },
      }),
    };
  } catch {
    return {
      outcome: 'TIMEOUT',
      environment: 'live',
      latencyMs: Date.now() - started,
      message: 'CBE legacy receipt fetch failed',
    };
  }
}

export class CbeProvider implements PaymentProvider {
  getName(): string {
    return 'cbe';
  }
  getDisplayName(): string {
    return 'Commercial Bank of Ethiopia';
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
    const legacy = extractLegacyCbeUrlData(request.reference);
    if (legacy) {
      return verifyCbeLegacy(legacy.reference, request.accountSuffix?.trim() || legacy.suffix);
    }
    const token = extractNewCbeToken(request.reference);
    if (token) return verifyCbeNew(token);
    if (!request.accountSuffix || request.accountSuffix.length !== 8) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'live',
        latencyMs: 0,
        message: 'CBE requires an 8-digit account suffix for FT references',
      };
    }
    return verifyCbeLegacy(request.reference.trim().toUpperCase(), request.accountSuffix.trim());
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      provider: this.getName(),
      healthy: true,
      latencyMs: 0,
      message: 'CBE JSON + legacy PDF verification enabled',
      checkedAt: new Date(),
    };
  }
}
