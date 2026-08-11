import { AppError } from '@ice/shared';
import type { PaymentProvider } from './payment-provider.js';
import type { ProviderCapabilities } from './capabilities.js';

export interface ProviderSummary {
  name: string;
  displayName: string;
  capabilities: ProviderCapabilities;
  integrationStatus: 'available' | 'pending' | 'disabled';
}

export class ProviderRegistry {
  private readonly providers = new Map<string, PaymentProvider>();

  register(provider: PaymentProvider): void {
    const name = provider.getName().toLowerCase();
    if (this.providers.has(name)) {
      throw new AppError('CONFLICT', `Provider already registered: ${name}`, 409);
    }
    this.providers.set(name, provider);
  }

  get(name: string): PaymentProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', `Unknown payment provider: ${name}`, 404);
    }
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }

  list(): ProviderSummary[] {
    return [...this.providers.values()].map((provider) => ({
      name: provider.getName(),
      displayName: provider.getDisplayName(),
      capabilities: provider.getCapabilities(),
      integrationStatus: provider.getIntegrationStatus(),
    }));
  }

  detect(reference: string): PaymentProvider | null {
    const upper = reference.toUpperCase();
    if (upper.startsWith('DEMO-')) {
      return this.has('demo') ? this.get('demo') : null;
    }
    return null;
  }

  detectFromRequest(input: {
    reference: string;
    accountSuffix?: string;
    phoneNumber?: string;
  }): PaymentProvider | null {
    const demo = this.detect(input.reference);
    if (demo) return demo;
    return null;
  }
}
