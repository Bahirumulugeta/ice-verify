import { describe, expect, it } from 'vitest';
import { isLikelyTelebirrReference, normalizeTelebirrReference } from '@ice/providers';

describe('telebirr reference parsing', () => {
  it('normalizes pasted receipt URLs', () => {
    expect(
      normalizeTelebirrReference('https://transactioninfo.ethiotelecom.et/receipt/DHB10ZKYIP'),
    ).toBe('DHB10ZKYIP');
  });

  it('accepts standard 10-character receipts', () => {
    expect(isLikelyTelebirrReference('DHB10ZKYIP')).toBe(true);
    expect(isLikelyTelebirrReference('dh82mc2fw4')).toBe(true);
  });
});
