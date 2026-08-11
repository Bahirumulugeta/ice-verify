import { randomBytes } from 'node:crypto';

export function createId(prefix: string): string {
  const id = randomBytes(12).toString('hex');
  return `${prefix}_${id}`;
}

export function createRequestId(): string {
  return createId('req');
}

export function createVerificationId(): string {
  return createId('ver');
}

export function createDeliveryId(): string {
  return createId('dlv');
}
