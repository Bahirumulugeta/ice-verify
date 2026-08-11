import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  userId: string;
  merchantId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  email: string;
  exp: number;
}

const COOKIE_NAME = 'ice_session';

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export function signSession(payload: Omit<SessionPayload, 'exp'>, secret: string, ttlSeconds = 60 * 60 * 24 * 7): string {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = toBase64Url(JSON.stringify(body));
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySession(token: string, secret: string): SessionPayload | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded).toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;
    if (!payload.userId || !payload.merchantId || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7 * 1000,
  };
}
