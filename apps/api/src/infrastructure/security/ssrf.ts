import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { AppError } from '@ice/shared';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
]);

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '0.0.0.0') return true;
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return false;
}

export async function assertSafeWebhookUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new AppError('WEBHOOK_INVALID_URL', 'Webhook URL is invalid', 400);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new AppError('WEBHOOK_INVALID_URL', 'Webhook URL must use http or https', 400);
  }

  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new AppError('WEBHOOK_INVALID_URL', 'Webhook URL must use https in production', 400);
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new AppError('WEBHOOK_INVALID_URL', 'Webhook URL host is not allowed', 400);
  }

  const addresses: string[] = [];
  if (isIP(hostname)) {
    addresses.push(hostname);
  } else {
    try {
      const records = await lookup(hostname, { all: true });
      addresses.push(...records.map((record) => record.address));
    } catch {
      throw new AppError('WEBHOOK_INVALID_URL', 'Webhook URL host could not be resolved', 400);
    }
  }

  if (addresses.some(isPrivateIp)) {
    throw new AppError('WEBHOOK_INVALID_URL', 'Webhook URL resolves to a private network', 400);
  }

  return url;
}
