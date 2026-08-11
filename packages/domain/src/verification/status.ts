export const VERIFICATION_STATUSES = [
  'CREATED',
  'PROCESSING',
  'VERIFIED',
  'NOT_FOUND',
  'PENDING',
  'FAILED',
  'PROVIDER_UNAVAILABLE',
  'AMOUNT_MISMATCH',
  'RECEIVER_MISMATCH',
  'DUPLICATE',
  'INVALID_REQUEST',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const TERMINAL_STATUSES: ReadonlySet<VerificationStatus> = new Set([
  'VERIFIED',
  'NOT_FOUND',
  'FAILED',
  'PROVIDER_UNAVAILABLE',
  'AMOUNT_MISMATCH',
  'RECEIVER_MISMATCH',
  'DUPLICATE',
  'INVALID_REQUEST',
]);

export function isTerminalStatus(status: VerificationStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isSuccessfulVerification(status: VerificationStatus): boolean {
  return status === 'VERIFIED';
}

export function toApiStatus(status: VerificationStatus): string {
  return status.toLowerCase();
}
