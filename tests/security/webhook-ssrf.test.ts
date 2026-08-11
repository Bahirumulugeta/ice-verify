import { describe, expect, it } from 'vitest';
import { assertSafeWebhookUrl } from '../../apps/api/src/infrastructure/security/ssrf.js';
import { verifyWebhookSignature, signWebhookPayload } from '../../apps/api/src/infrastructure/crypto/webhooks.js';

describe('webhook security', () => {
  it('blocks localhost webhook URLs', async () => {
    await expect(assertSafeWebhookUrl('http://localhost:3000/hook')).rejects.toThrow();
    await expect(assertSafeWebhookUrl('http://127.0.0.1/hook')).rejects.toThrow();
  });

  it('rejects stale webhook signatures', () => {
    const secret = 'whsec_test';
    const body = '{"ok":true}';
    const timestamp = Math.floor(Date.now() / 1000) - 10_000;
    const signature = signWebhookPayload({
      secret,
      timestamp,
      deliveryId: 'dlv_1',
      body,
    });

    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        deliveryId: 'dlv_1',
        body,
        signature,
        toleranceSeconds: 300,
      }),
    ).toBe(false);
  });

  it('accepts fresh signatures', () => {
    const secret = 'whsec_test';
    const body = '{"ok":true}';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload({
      secret,
      timestamp,
      deliveryId: 'dlv_1',
      body,
    });

    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        deliveryId: 'dlv_1',
        body,
        signature,
        toleranceSeconds: 300,
      }),
    ).toBe(true);
  });
});
