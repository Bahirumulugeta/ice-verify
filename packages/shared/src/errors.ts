export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYMENT_NOT_FOUND'
  | 'AMOUNT_MISMATCH'
  | 'RECEIVER_MISMATCH'
  | 'DUPLICATE_REFERENCE'
  | 'PAYMENT_ALREADY_CLAIMED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'VERIFICATION_FAILED'
  | 'INVALID_STATE_TRANSITION'
  | 'WEBHOOK_INVALID_URL'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
  readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
