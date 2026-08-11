import { describe, expect, it } from 'vitest';
import {
  signSession,
  verifySession,
} from '../../apps/api/src/infrastructure/auth/session.ts';

describe('session tokens', () => {
  const secret = 'test-jwt-secret-with-at-least-32-chars!!';

  it('signs and verifies a session', () => {
    const token = signSession(
      {
        userId: 'user_1',
        merchantId: 'merch_1',
        role: 'OWNER',
        email: 'demo@example.com',
      },
      secret,
      60,
    );
    const payload = verifySession(token, secret);
    expect(payload?.userId).toBe('user_1');
    expect(payload?.merchantId).toBe('merch_1');
    expect(payload?.role).toBe('OWNER');
  });

  it('rejects tampered tokens', () => {
    const token = signSession(
      {
        userId: 'user_1',
        merchantId: 'merch_1',
        role: 'OWNER',
        email: 'demo@example.com',
      },
      secret,
    );
    expect(verifySession(`${token}x`, secret)).toBeNull();
  });
});
