import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { getConfig } from '../../config/env.js';

function encryptionKey(): Buffer {
  return createHash('sha256').update(getConfig().API_KEY_PEPPER).digest();
}

export function generateWebhookSecret(): { rawSecret: string; prefix: string; encrypted: string } {
  const rawSecret = `whsec_${randomBytes(24).toString('base64url')}`;
  return {
    rawSecret,
    prefix: rawSecret.slice(0, 12),
    encrypted: encryptSecret(rawSecret),
  };
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted secret payload');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function signWebhookPayload(params: {
  secret: string;
  timestamp: number;
  deliveryId: string;
  body: string;
}): string {
  const payload = `${params.timestamp}.${params.deliveryId}.${params.body}`;
  return createHmac('sha256', params.secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: number;
  deliveryId: string;
  body: string;
  signature: string;
  toleranceSeconds: number;
  nowSeconds?: number;
}): boolean {
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - params.timestamp) > params.toleranceSeconds) {
    return false;
  }
  const expected = signWebhookPayload(params);
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
