import {
  DEFAULT_CAPABILITIES,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderHealthResult,
  type ProviderVerificationRequest,
  type ProviderVerificationResult,
} from '@ice/domain';
import { AppError } from '@ice/shared';

/**
 * Scaffold for authorized real-provider integrations.
 * Does not call external banking systems until credentials and official APIs are configured.
 */
export class PendingProvider implements PaymentProvider {
  constructor(
    private readonly name: string,
    private readonly displayName: string,
    private readonly capabilities: ProviderCapabilities = {
      ...DEFAULT_CAPABILITIES,
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
    },
  ) {}

  getName(): string {
    return this.name;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  getIntegrationStatus(): 'available' | 'pending' | 'disabled' {
    return 'pending';
  }

  async verify(_request: ProviderVerificationRequest): Promise<ProviderVerificationResult> {
    throw new AppError(
      'PROVIDER_UNAVAILABLE',
      `${this.displayName} integration is pending authorized API access`,
      503,
      { provider: this.name, integrationStatus: 'pending' },
    );
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    return {
      provider: this.name,
      healthy: false,
      latencyMs: 0,
      message: 'Integration pending — no live provider credentials configured',
      checkedAt: new Date(),
    };
  }
}
