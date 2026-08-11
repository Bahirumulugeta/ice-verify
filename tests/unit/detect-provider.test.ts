import { describe, expect, it } from 'vitest';
import { detectProvider } from '@ice/providers';

describe('detectProvider', () => {
  it('detects telebirr-style references', () => {
    expect(detectProvider({ reference: 'CJU5RZ5NM3' })).toBe('telebirr');
  });

  it('detects legacy CBE with 8-digit suffix', () => {
    expect(
      detectProvider({ reference: 'FT1234567890', accountSuffix: '12345678' }),
    ).toBe('cbe');
  });

  it('detects BOA with 5-digit suffix', () => {
    expect(
      detectProvider({ reference: 'FT1234567890', accountSuffix: '12345' }),
    ).toBe('boa');
  });

  it('detects CBE Birr with phone', () => {
    expect(
      detectProvider({ reference: 'ABCDE12345', phoneNumber: '0912345678' }),
    ).toBe('cbebirr');
  });

  it('detects dashen 16-digit refs', () => {
    expect(detectProvider({ reference: '1234567890123456' })).toBe('dashen');
  });
});
