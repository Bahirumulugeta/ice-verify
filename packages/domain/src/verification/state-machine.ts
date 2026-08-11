import { AppError } from '@ice/shared';
import { type VerificationStatus, isTerminalStatus } from './status.js';

const ALLOWED_TRANSITIONS: Record<VerificationStatus, readonly VerificationStatus[]> = {
  CREATED: ['PROCESSING', 'INVALID_REQUEST'],
  PROCESSING: [
    'VERIFIED',
    'NOT_FOUND',
    'PENDING',
    'FAILED',
    'PROVIDER_UNAVAILABLE',
    'AMOUNT_MISMATCH',
    'RECEIVER_MISMATCH',
    'DUPLICATE',
    'INVALID_REQUEST',
  ],
  PENDING: [
    'PROCESSING',
    'VERIFIED',
    'NOT_FOUND',
    'FAILED',
    'PROVIDER_UNAVAILABLE',
    'AMOUNT_MISMATCH',
    'RECEIVER_MISMATCH',
    'DUPLICATE',
  ],
  VERIFIED: [],
  NOT_FOUND: [],
  FAILED: [],
  PROVIDER_UNAVAILABLE: ['PROCESSING'],
  AMOUNT_MISMATCH: [],
  RECEIVER_MISMATCH: [],
  DUPLICATE: [],
  INVALID_REQUEST: [],
};

export function canTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: VerificationStatus, to: VerificationStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition verification from ${from} to ${to}`,
      409,
      { from, to },
    );
  }
}

export function assertNotTerminal(status: VerificationStatus): void {
  if (isTerminalStatus(status) && status !== 'PROVIDER_UNAVAILABLE') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Verification is already in terminal status ${status}`,
      409,
      { status },
    );
  }
}
