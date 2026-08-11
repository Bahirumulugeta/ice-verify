import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getConfig } from '../../config/env.js';

export interface GeneratedApiKey {
  rawKey: string;
  prefix: string;
  hash: string;
  environment: 'test' | 'live';
}

export function generateApiKey(environment: 'test' | 'live'): GeneratedApiKey {
  const secret = randomBytes(24).toString('base64url');
  const rawKey = `ice_${environment}_${secret}`;
  const prefix = rawKey.slice(0, 16);
  return {
    rawKey,
    prefix,
    hash: hashApiKey(rawKey),
    environment,
  };
}

export function hashApiKey(rawKey: string): string {
  const pepper = getConfig().API_KEY_PEPPER;
  return createHash('sha256').update(`${pepper}:${rawKey}`).digest('hex');
}

export function verifyApiKey(rawKey: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashApiKey(rawKey));
  const expected = Buffer.from(expectedHash);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

export function parseApiKeyEnvironment(rawKey: string): 'test' | 'live' | null {
  if (rawKey.startsWith('ice_test_')) return 'test';
  if (rawKey.startsWith('ice_live_')) return 'live';
  return null;
}
