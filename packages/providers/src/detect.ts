export type DetectedProvider =
  | 'telebirr'
  | 'cbe'
  | 'cbebirr'
  | 'dashen'
  | 'boa'
  | null;

export interface DetectInput {
  reference: string;
  accountSuffix?: string;
  phoneNumber?: string;
}

const NEW_CBE_URL = /^https?:\/\/mbreciept\.cbe\.com\.et\/([A-Za-z0-9-]+)\/?$/i;
const NEW_CBE_TOKEN = /^[A-Za-z0-9-]{15,40}$/;
const LEGACY_CBE_REF = /^FT[A-Z0-9]{10}$/i;
const LEGACY_CBE_COMBINED = /^(FT[A-Z0-9]{10})(\d{8})$/i;

export function extractNewCbeToken(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(NEW_CBE_URL);
  if (urlMatch) return urlMatch[1] ?? null;
  // Pure numeric 16-digit refs are Dashen, not CBE tokens.
  if (/^\d{16}$/.test(trimmed)) return null;
  if (!trimmed.toUpperCase().startsWith('FT') && NEW_CBE_TOKEN.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function extractLegacyCbeUrlData(
  input: string,
): { reference: string; suffix: string } | null {
  try {
    const url = new URL(input.trim());
    if (url.hostname.toLowerCase() !== 'apps.cbe.com.et') return null;
    const combinedId = url.searchParams.get('id')?.trim();
    if (!combinedId) return null;
    const match = combinedId.match(LEGACY_CBE_COMBINED);
    if (!match) return null;
    return { reference: (match[1] ?? '').toUpperCase(), suffix: match[2] ?? '' };
  } catch {
    return null;
  }
}

export function detectProvider(input: DetectInput): DetectedProvider {
  const ref = input.reference.trim();
  const len = ref.length;

  if (len === 16 && /^\d{16}$/.test(ref)) return 'dashen';
  if (extractLegacyCbeUrlData(ref) || extractNewCbeToken(ref)) return 'cbe';
  if (LEGACY_CBE_REF.test(ref) && input.accountSuffix?.length === 8) return 'cbe';
  if (LEGACY_CBE_REF.test(ref) && input.accountSuffix?.length === 5) return 'boa';
  if (/^[A-Z0-9]{10}$/i.test(ref) && input.phoneNumber) return 'cbebirr';
  if (/^[A-Z0-9]{8,14}$/i.test(ref) && !input.accountSuffix && !input.phoneNumber) {
    return 'telebirr';
  }
  if (LEGACY_CBE_REF.test(ref)) return 'cbe';
  return null;
}
