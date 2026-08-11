import { ProviderRegistry } from '@ice/domain';
import { DemoProvider } from './demo-provider.js';
import { PendingProvider } from './pending-provider.js';
import { TelebirrProvider } from './telebirr/telebirr-provider.js';
import { CbeProvider } from './cbe/cbe-provider.js';
import { BoaProvider } from './boa/boa-provider.js';
import { DashenProvider } from './dashen/dashen-provider.js';
import { CbeBirrProvider } from './cbebirr/cbebirr-provider.js';
import type { TelebirrProviderOptions } from './telebirr/types.js';
import { detectProvider } from './detect.js';

export interface ProviderRegistryOptions {
  telebirr?: TelebirrProviderOptions;
}

export function createProviderRegistry(options: ProviderRegistryOptions = {}): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new DemoProvider());
  registry.register(new TelebirrProvider(options.telebirr));
  registry.register(new CbeProvider());
  registry.register(new CbeBirrProvider());
  registry.register(new BoaProvider());
  registry.register(new DashenProvider());
  registry.register(new PendingProvider('awash', 'Awash Bank'));
  return registry;
}

export function resolveProviderName(input: {
  provider?: string;
  reference: string;
  accountSuffix?: string;
  phoneNumber?: string;
}): string {
  if (input.provider) return input.provider.toLowerCase();
  const detected = detectProvider({
    reference: input.reference,
    accountSuffix: input.accountSuffix,
    phoneNumber: input.phoneNumber,
  });
  if (!detected) {
    throw new Error('Unable to detect provider from reference. Pass provider explicitly.');
  }
  return detected;
}
