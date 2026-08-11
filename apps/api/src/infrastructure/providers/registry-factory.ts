import { createProviderRegistry as createSharedRegistry } from '@ice/providers';
import type { AppConfig } from '@ice/config';

export function createProviderRegistry(config?: AppConfig) {
  // Telebirr options come from env so local timeouts / relays can be tuned without code changes.
  return createSharedRegistry({
    telebirr: config
      ? {
          primaryReceiptBaseUrl: config.TELEBIRR_PRIMARY_RECEIPT_URL,
          fallbackProxies: config.telebirrFallbackProxies,
          proxyLabels: config.telebirrProxyLabels,
          proxyKey: config.TELEBIRR_PROXY_KEY || undefined,
          skipPrimary: config.TELEBIRR_SKIP_PRIMARY,
          timeoutMs: config.TELEBIRR_TIMEOUT_MS,
          totalTimeoutMs: config.TELEBIRR_TOTAL_TIMEOUT_MS,
        }
      : undefined,
  });
}
