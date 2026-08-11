import { createProviderRegistry } from '@ice/providers';
import type { AppConfig } from '@ice/config';

export function buildProviderRegistry(config: AppConfig) {
  return createProviderRegistry({
    telebirr: {
      primaryReceiptBaseUrl: config.TELEBIRR_PRIMARY_RECEIPT_URL,
      fallbackProxies: config.telebirrFallbackProxies,
      proxyLabels: config.telebirrProxyLabels,
      proxyKey: config.TELEBIRR_PROXY_KEY || undefined,
      skipPrimary: config.TELEBIRR_SKIP_PRIMARY,
      timeoutMs: config.TELEBIRR_TIMEOUT_MS,
      totalTimeoutMs: config.TELEBIRR_TOTAL_TIMEOUT_MS,
    },
  });
}
