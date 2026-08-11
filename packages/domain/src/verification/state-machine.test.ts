import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from './state-machine.js';

describe('verification state machine', () => {
  it('allows CREATED -> PROCESSING', () => {
    expect(canTransition('CREATED', 'PROCESSING')).toBe(true);
  });

  it('allows PROCESSING to terminal outcomes', () => {
    expect(canTransition('PROCESSING', 'VERIFIED')).toBe(true);
    expect(canTransition('PROCESSING', 'AMOUNT_MISMATCH')).toBe(true);
    expect(canTransition('PROCESSING', 'RECEIVER_MISMATCH')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransition('VERIFIED', 'PROCESSING')).toBe(false);
    expect(() => assertTransition('VERIFIED', 'FAILED')).toThrow(/Cannot transition/);
  });

  it('allows PROVIDER_UNAVAILABLE retry to PROCESSING', () => {
    expect(canTransition('PROVIDER_UNAVAILABLE', 'PROCESSING')).toBe(true);
  });
});
