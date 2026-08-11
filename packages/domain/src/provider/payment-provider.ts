import type { PaymentDetails } from '../payment/payment-details.js';
import type { ProviderCapabilities } from './capabilities.js';
import type { VerificationStatus } from '../verification/status.js';

export type ProviderOutcome =
  | 'FOUND'
  | 'NOT_FOUND'
  | 'PENDING'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT';

export interface ProviderVerificationRequest {
  reference: string;
  /** CBE (8 digits) or Bank of Abyssinia (5 digits) account suffix */
  accountSuffix?: string;
  /** Required for CBE Birr */
  phoneNumber?: string;
  expectedAmount?: number;
  currency?: string;
  expectedReceiver?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderVerificationResult {
  outcome: ProviderOutcome;
  payment?: PaymentDetails;
  providerStatus?: string;
  rawCode?: string;
  message?: string;
  environment: 'demo' | 'test' | 'live';
  latencyMs: number;
}

export interface ProviderHealthResult {
  provider: string;
  healthy: boolean;
  latencyMs: number;
  message?: string;
  checkedAt: Date;
}

export interface PaymentProvider {
  getName(): string;
  getDisplayName(): string;
  getCapabilities(): ProviderCapabilities;
  getIntegrationStatus(): 'available' | 'pending' | 'disabled';
  verify(request: ProviderVerificationRequest): Promise<ProviderVerificationResult>;
  healthCheck(): Promise<ProviderHealthResult>;
}

export function mapProviderOutcomeToStatus(
  outcome: ProviderOutcome,
): Extract<
  VerificationStatus,
  'VERIFIED' | 'NOT_FOUND' | 'PENDING' | 'FAILED' | 'PROVIDER_UNAVAILABLE'
> {
  switch (outcome) {
    case 'FOUND':
      return 'VERIFIED';
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'PENDING':
      return 'PENDING';
    case 'TIMEOUT':
      return 'PROVIDER_UNAVAILABLE';
    case 'PROVIDER_ERROR':
      return 'FAILED';
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}
