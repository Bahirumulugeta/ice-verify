import { describe, expect, it } from 'vitest';
import { RiskEngine } from './risk-engine.js';

describe('RiskEngine', () => {
  const engine = new RiskEngine();

  it('returns LOW risk for clean verification', () => {
    const result = engine.evaluate({
      paymentExists: true,
      amountMatches: true,
      receiverMatches: true,
      currencyMatches: true,
      isDuplicate: false,
      providerConsistent: true,
      verificationFrequencyHigh: false,
      timestampAnomaly: false,
      receiptMismatch: false,
    });

    expect(result.level).toBe('LOW');
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  it('flags amount and receiver mismatches', () => {
    const result = engine.evaluate({
      paymentExists: true,
      amountMatches: false,
      receiverMatches: false,
      currencyMatches: true,
      isDuplicate: false,
      providerConsistent: true,
      verificationFrequencyHigh: false,
      timestampAnomaly: false,
      receiptMismatch: false,
    });

    expect(result.level).toBe('HIGH');
    expect(result.flags.map((f) => f.code)).toEqual(
      expect.arrayContaining(['AMOUNT_MISMATCH', 'RECEIVER_MISMATCH']),
    );
  });

  it('marks duplicates as CRITICAL', () => {
    const result = engine.evaluate({
      paymentExists: true,
      amountMatches: true,
      receiverMatches: true,
      currencyMatches: true,
      isDuplicate: true,
      providerConsistent: true,
      verificationFrequencyHigh: false,
      timestampAnomaly: false,
      receiptMismatch: false,
    });

    expect(result.level).toBe('CRITICAL');
  });
});
