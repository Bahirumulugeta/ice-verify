import { AppError } from '@ice/shared';
import { fetchBuffer } from '../shared/http.js';
import { isValidTelebirrReceipt } from './parse.js';
import { parseTelebirrJson, scrapeTelebirrReceipt } from './scraper.js';
import type { TelebirrProviderOptions, TelebirrProxyDescriptor, TelebirrReceipt } from './types.js';

const DEFAULT_PRIMARY_URL = 'https://transactioninfo.ethiotelecom.et/receipt/';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getTelebirrProxyDescriptors(
  fallbackProxies: string[] = [],
  proxyLabels: string[] = [],
): TelebirrProxyDescriptor[] {
  return fallbackProxies
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index) => ({
      id: index === 0 ? 'preferred' : `relay-${index}`,
      label: proxyLabels[index]?.trim() || (index === 0 ? 'Preferred relay' : `Community relay ${index}`),
      role: index === 0 ? 'preferred' : 'fallback',
      url,
    }));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
}

function isTlsFailure(error: unknown): boolean {
  const message = errorText(error);
  return (
    message.includes('certificate') ||
    message.includes('cert') ||
    message.includes('ssl') ||
    message.includes('tls') ||
    message.includes('unable to verify')
  );
}

function isTransportFailure(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error && error.name === 'AbortError') return true;
  const message = errorText(error);
  return (
    isTlsFailure(error) ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('abort') ||
    message.includes('fetch failed') ||
    message.includes('econn') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('network') ||
    message.includes('socket')
  );
}

function providerUnavailable(message: string): AppError {
  return new AppError('PROVIDER_UNAVAILABLE', message, 503);
}

async function fetchHtml(
  url: string,
  options: { timeoutMs: number; fetchImpl: typeof fetch; insecureTls?: boolean },
): Promise<{ status: number; body: string }> {
  if (options.insecureTls) {
    const result = await fetchBuffer(url, {
      timeoutMs: options.timeoutMs,
      insecureTls: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': BROWSER_UA,
      },
    });
    return {
      status: result.status,
      body: Buffer.from(result.buffer).toString('utf8'),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': BROWSER_UA,
      },
    });
    return {
      status: response.status,
      body: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFromPrimarySource(
  reference: string,
  options: Required<Pick<TelebirrProviderOptions, 'primaryReceiptBaseUrl' | 'timeoutMs' | 'fetchImpl'>>,
): Promise<TelebirrReceipt | null> {
  const url = `${options.primaryReceiptBaseUrl}${encodeURIComponent(reference)}`;
  let lastError: unknown;

  for (const insecureTls of [false, true]) {
    try {
      const response = await fetchHtml(url, {
        timeoutMs: options.timeoutMs,
        fetchImpl: options.fetchImpl,
        insecureTls,
      });

      if (response.status === 404) return null;
      if (response.status >= 500) {
        throw providerUnavailable(`Telebirr receipt site returned HTTP ${response.status}`);
      }
      if (response.status >= 400) {
        throw providerUnavailable(`Telebirr receipt site rejected the request (HTTP ${response.status})`);
      }
      if (response.body.length < 50) return null;

      const receipt = scrapeTelebirrReceipt(response.body);
      if (isValidTelebirrReceipt(receipt)) return receipt;

      const lowered = response.body.toLowerCase();
      if (
        lowered.includes('not found') ||
        lowered.includes('no receipt') ||
        lowered.includes('invalid receipt')
      ) {
        return null;
      }

      throw providerUnavailable(
        'Telebirr receipt page was reached but could not be parsed. The HTML layout may have changed.',
      );
    } catch (error) {
      if (error instanceof AppError && error.code === 'PROVIDER_UNAVAILABLE') {
        lastError = error;
        continue;
      }
      lastError = error;
      if (!insecureTls && isTlsFailure(error)) {
        continue;
      }
      break;
    }
  }

  if (isTransportFailure(lastError) || (lastError instanceof AppError && lastError.code === 'PROVIDER_UNAVAILABLE')) {
    throw providerUnavailable(
      'Telebirr receipt site timed out or is unreachable. This is not the same as an invalid reference — retry shortly or configure TELEBIRR_FALLBACK_PROXIES.',
    );
  }

  return null;
}

export async function fetchFromProxySource(
  reference: string,
  proxyUrl: string,
  options: {
    proxyKey?: string;
    timeoutMs: number;
    fetchImpl: typeof fetch;
  },
): Promise<TelebirrReceipt | null> {
  const separator = proxyUrl.includes('?') ? '&' : '?';
  const keyed = options.proxyKey
    ? `${proxyUrl}${reference}${separator}key=${encodeURIComponent(options.proxyKey)}`
    : `${proxyUrl}${reference}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    let response: { status: number; body: string; contentType: string };
    try {
      const res = await options.fetchImpl(keyed, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          Accept: 'application/json,text/html',
          'User-Agent': BROWSER_UA,
        },
      });
      response = {
        status: res.status,
        body: await res.text(),
        contentType: res.headers.get('content-type') ?? '',
      };
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 500) {
      throw providerUnavailable('Telebirr fallback relay is unavailable');
    }

    let data: unknown = response.body;
    if (response.contentType.includes('application/json') || response.body.trim().startsWith('{')) {
      try {
        data = JSON.parse(response.body) as unknown;
      } catch {
        data = response.body;
      }
    }

    if (data && typeof data === 'object') {
      const payload = data as { success?: boolean; error?: string; details?: string };
      if (payload.success === false && payload.error) {
        throw new AppError('PAYMENT_NOT_FOUND', payload.error, 404, {
          details: payload.details,
          source: 'telebirr_proxy',
        });
      }
      const parsed = parseTelebirrJson(data);
      if (parsed && isValidTelebirrReceipt(parsed)) {
        return parsed;
      }
    }

    if (typeof data === 'string') {
      const scraped = scrapeTelebirrReceipt(data);
      return isValidTelebirrReceipt(scraped) ? scraped : null;
    }

    return null;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw providerUnavailable('Telebirr fallback relay timed out or failed');
  }
}

export async function verifyTelebirrReceipt(
  reference: string,
  options: TelebirrProviderOptions = {},
): Promise<TelebirrReceipt | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = positiveInteger(options.timeoutMs, 18_000);
  const totalTimeoutMs = positiveInteger(options.totalTimeoutMs, 25_000);
  const primaryReceiptBaseUrl = options.primaryReceiptBaseUrl ?? DEFAULT_PRIMARY_URL;
  const proxies = getTelebirrProxyDescriptors(options.fallbackProxies ?? [], options.proxyLabels ?? []);
  const started = Date.now();
  let transportError: AppError | null = null;

  if (!options.skipPrimary) {
    try {
      const primary = await fetchFromPrimarySource(reference, {
        primaryReceiptBaseUrl,
        timeoutMs,
        fetchImpl,
      });
      if (primary) return primary;
    } catch (error) {
      if (error instanceof AppError && error.code === 'PROVIDER_UNAVAILABLE') {
        transportError = error;
      } else {
        throw error;
      }
    }
  }

  for (const proxy of proxies) {
    if (Date.now() - started > totalTimeoutMs) {
      throw providerUnavailable('Telebirr verification timed out before relays responded');
    }
    try {
      const receipt = await fetchFromProxySource(reference, proxy.url, {
        proxyKey: options.proxyKey,
        timeoutMs,
        fetchImpl,
      });
      if (receipt) return receipt;
    } catch (error) {
      if (error instanceof AppError && error.code === 'PAYMENT_NOT_FOUND') {
        throw error;
      }
    }
  }

  if (transportError) throw transportError;
  return null;
}
