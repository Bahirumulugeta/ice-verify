import type { RiskAssessment } from '../risk/types.js';
import type { VerificationStatus } from './status.js';

export interface CreateVerificationCommand {
  merchantId: string;
  provider?: string;
  reference: string;
  accountSuffix?: string;
  phoneNumber?: string;
  expectedAmount?: number;
  currency?: string;
  expectedReceiver?: string;
  metadata?: Record<string, unknown>;
  async?: boolean;
  rejectIfClaimed?: boolean;
  autoClaim?: boolean;
  externalOrderId?: string;
  idempotencyKey?: string;
  environment: 'test' | 'live';
  requestId: string;
}

export interface VerificationPaymentView {
  amount?: number;
  currency?: string;
  sender?: string | null;
  receiver?: string | null;
  payerName?: string | null;
  creditedPartyName?: string | null;
  transactionDate?: string | null;
  providerStatus?: string | null;
  serviceFee?: string | null;
  totalPaidAmount?: string | null;
  bankName?: string | null;
}

export interface VerificationView {
  verificationId: string;
  status: VerificationStatus;
  verified: boolean;
  provider: string;
  reference: string;
  amount?: number;
  currency?: string;
  expectedAmount?: number;
  actualAmount?: number;
  expectedReceiver?: string;
  actualReceiver?: string;
  receiverMatched?: boolean;
  payment?: VerificationPaymentView;
  risk?: RiskAssessment;
  environment: 'demo' | 'test' | 'live';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Provider or engine explanation, especially for failures */
  message?: string;
  /** Present when autoClaim succeeded */
  claimed?: boolean;
  claimId?: string;
}
