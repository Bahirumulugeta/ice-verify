import type { TelebirrReceipt } from './types.js';

export function parseBirrAmount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/birr/gi, '')
    .replace(/etb/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function parseTelebirrDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  // DD-MM-YYYY HH:MM:SS
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = match;
  return new Date(
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)),
  );
}

export function isValidTelebirrReceipt(receipt: TelebirrReceipt): boolean {
  return Boolean(receipt.receiptNo && receipt.payerName && receipt.transactionStatus);
}

export function normalizeTelebirrReference(reference: string): string {
  const trimmed = reference.trim();
  const receiptUrl = trimmed.match(
    /transactioninfo\.ethiotelecom\.et\/receipt\/([A-Za-z0-9]+)/i,
  );
  if (receiptUrl?.[1]) return receiptUrl[1].toUpperCase();
  return trimmed.toUpperCase();
}

export function isLikelyTelebirrReference(reference: string): boolean {
  return /^[A-Z0-9]{8,14}$/i.test(normalizeTelebirrReference(reference));
}

export function mapTelebirrStatus(
  statusText: string,
): 'COMPLETED' | 'PENDING' | 'FAILED' | 'UNKNOWN' {
  const normalized = statusText.trim().toLowerCase();
  if (!normalized) return 'UNKNOWN';
  if (normalized.includes('complete') || normalized.includes('success') || normalized.includes('ተሳክቷል')) {
    return 'COMPLETED';
  }
  if (normalized.includes('pending') || normalized.includes('processing')) {
    return 'PENDING';
  }
  if (normalized.includes('fail') || normalized.includes('cancel') || normalized.includes('reject')) {
    return 'FAILED';
  }
  return 'UNKNOWN';
}
