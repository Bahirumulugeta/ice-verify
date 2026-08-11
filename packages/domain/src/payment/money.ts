import { AppError } from '@ice/shared';

export class Money {
  readonly amount: number;
  readonly currency: string;

  constructor(amount: number, currency: string) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new AppError('INVALID_REQUEST', 'Amount must be a non-negative finite number');
    }
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new AppError('INVALID_REQUEST', 'Currency must be a 3-letter ISO code');
    }
    this.amount = amount;
    this.currency = normalized;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  matchesAmount(expected?: number): boolean {
    if (expected === undefined) {
      return true;
    }
    return this.amount === expected;
  }

  matchesCurrency(expected?: string): boolean {
    if (!expected) {
      return true;
    }
    return this.currency === expected.trim().toUpperCase();
  }
}
