import { describe, expect, it } from 'vitest';
import { AppError } from '@ice/shared';
import { fetchFromPrimarySource } from './client.js';

describe('fetchFromPrimarySource', () => {
  it('maps connection timeouts to PROVIDER_UNAVAILABLE, not not-found', async () => {
    const fetchImpl = (async () => {
      const error = new Error('fetch failed');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;

    await expect(
      fetchFromPrimarySource('DHB10ZKYIP', {
        primaryReceiptBaseUrl: 'https://transactioninfo.ethiotelecom.et/receipt/',
        timeoutMs: 50,
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    } satisfies Partial<AppError>);
  });
});
