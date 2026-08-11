import {
  PaymentDetails,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderHealthResult,
  type ProviderVerificationRequest,
  type ProviderVerificationResult,
} from '@ice/domain';

interface DemoScenario {
  outcome: ProviderVerificationResult['outcome'];
  payment?: PaymentDetails;
  message?: string;
}

const SCENARIOS: Record<string, DemoScenario> = {
  'DEMO-VALID-001': {
    outcome: 'FOUND',
    payment: new PaymentDetails({
      reference: 'DEMO-VALID-001',
      provider: 'demo',
      amount: 1500,
      currency: 'ETB',
      sender: '0911000001',
      receiver: '0912345678',
      transactionDate: new Date('2026-01-15T10:00:00.000Z'),
      status: 'COMPLETED',
      providerTransactionId: 'demo_txn_valid_001',
      metadata: { environment: 'demo', scenario: 'valid' },
    }),
  },
  'DEMO-VALID-002': {
    outcome: 'FOUND',
    payment: new PaymentDetails({
      reference: 'DEMO-VALID-002',
      provider: 'demo',
      amount: 250.5,
      currency: 'ETB',
      sender: '0911000002',
      receiver: '0918765432',
      transactionDate: new Date('2026-02-01T12:30:00.000Z'),
      status: 'COMPLETED',
      providerTransactionId: 'demo_txn_valid_002',
      metadata: { environment: 'demo', scenario: 'valid' },
    }),
  },
  'DEMO-PENDING-001': {
    outcome: 'PENDING',
    payment: new PaymentDetails({
      reference: 'DEMO-PENDING-001',
      provider: 'demo',
      amount: 900,
      currency: 'ETB',
      receiver: '0912345678',
      status: 'PENDING',
      providerTransactionId: 'demo_txn_pending_001',
      metadata: { environment: 'demo', scenario: 'pending' },
    }),
    message: 'Payment is still pending with the provider',
  },
  'DEMO-NOT-FOUND-001': {
    outcome: 'NOT_FOUND',
    message: 'No payment found for reference',
  },
  'DEMO-AMOUNT-MISMATCH-001': {
    outcome: 'FOUND',
    payment: new PaymentDetails({
      reference: 'DEMO-AMOUNT-MISMATCH-001',
      provider: 'demo',
      amount: 1200,
      currency: 'ETB',
      receiver: '0912345678',
      status: 'COMPLETED',
      providerTransactionId: 'demo_txn_amount_001',
      metadata: { environment: 'demo', scenario: 'amount_mismatch' },
    }),
  },
  'DEMO-RECEIVER-MISMATCH-001': {
    outcome: 'FOUND',
    payment: new PaymentDetails({
      reference: 'DEMO-RECEIVER-MISMATCH-001',
      provider: 'demo',
      amount: 1500,
      currency: 'ETB',
      receiver: '0900000000',
      status: 'COMPLETED',
      providerTransactionId: 'demo_txn_receiver_001',
      metadata: { environment: 'demo', scenario: 'receiver_mismatch' },
    }),
  },
  'DEMO-DUPLICATE-001': {
    outcome: 'FOUND',
    payment: new PaymentDetails({
      reference: 'DEMO-DUPLICATE-001',
      provider: 'demo',
      amount: 1500,
      currency: 'ETB',
      receiver: '0912345678',
      status: 'COMPLETED',
      providerTransactionId: 'demo_txn_duplicate_001',
      metadata: { environment: 'demo', scenario: 'duplicate', forceDuplicate: true },
    }),
  },
  'DEMO-PROVIDER-ERROR-001': {
    outcome: 'PROVIDER_ERROR',
    message: 'Simulated provider error',
  },
};

export class DemoProvider implements PaymentProvider {
  getName(): string {
    return 'demo';
  }

  getDisplayName(): string {
    return 'Demo Provider';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: true,
      supportsReceiptVerification: false,
      supportsAsyncVerification: true,
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
    const key = request.reference.trim().toUpperCase();
    const scenario = SCENARIOS[key];

    if (!scenario) {
      return {
        outcome: 'NOT_FOUND',
        environment: 'demo',
        latencyMs: Date.now() - started,
        message: 'Unknown demo reference. Use documented DEMO-* scenarios.',
      };
    }

    return {
      outcome: scenario.outcome,
      payment: scenario.payment,
      message: scenario.message,
      environment: 'demo',
      latencyMs: Date.now() - started,
      providerStatus: scenario.outcome,
    };
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const started = Date.now();
    return {
      provider: this.getName(),
      healthy: true,
      latencyMs: Date.now() - started,
      message: 'Demo provider is available',
      checkedAt: new Date(),
    };
  }
}

export const DEMO_SCENARIO_KEYS = Object.keys(SCENARIOS);
