import { describe, expect, it, vi } from 'vitest';
import {
  BoaProvider,
  CbeBirrProvider,
  CbeProvider,
  DashenProvider,
  DemoProvider,
  TelebirrProvider,
} from '@ice/providers';
import type { PaymentProvider } from '@ice/domain';

function runContractSuite(provider: PaymentProvider) {
  describe(`${provider.getName()} provider contract`, () => {
    it('exposes capabilities and integration status', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toHaveProperty('supportsAmountValidation');
      expect(['available', 'pending', 'disabled']).toContain(provider.getIntegrationStatus());
    });

    it('supports health check shape', async () => {
      const health = await provider.healthCheck();
      expect(health.provider).toBe(provider.getName());
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.latencyMs).toBe('number');
    });
  });
}

describe('provider contracts', () => {
  runContractSuite(new DemoProvider());
  runContractSuite(new TelebirrProvider());
  runContractSuite(new CbeProvider());
  runContractSuite(new CbeBirrProvider());
  runContractSuite(new BoaProvider());
  runContractSuite(new DashenProvider());

  it('demo valid payment', async () => {
    const provider = new DemoProvider();
    const result = await provider.verify({ reference: 'DEMO-VALID-001' });
    expect(result.outcome).toBe('FOUND');
    expect(result.environment).toBe('demo');
    expect(result.payment?.amount).toBe(1500);
  });

  it('demo not found', async () => {
    const provider = new DemoProvider();
    const result = await provider.verify({ reference: 'DEMO-NOT-FOUND-001' });
    expect(result.outcome).toBe('NOT_FOUND');
  });

  it('telebirr verifies from receipt HTML', async () => {
    const html = `
      <html><body><table>
        <tr><td>የከፋይ ስም/Payer Name</td><td>Abebe Kebede</td></tr>
        <tr><td>የከፋይ ቴሌብር ቁ./Payer telebirr no.</td><td>251911234567</td></tr>
        <tr><td>የገንዘብ ተቀባይ ስም/Credited Party name</td><td>Merchant Shop</td></tr>
        <tr><td>የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no</td><td>251900000001</td></tr>
        <tr><td>የክፍያው ሁኔታ/transaction status</td><td>Completed</td></tr>
        <tr>
          <td class="receipttableTd receipttableTd2">Receipt No</td>
          <td class="receipttableTd receipttableTd2">CJU5RZ5NM3</td>
        </tr>
        <tr><td class="receipttableTd">15-01-2026 10:22:11</td></tr>
        <tr><td>የተከፈለው መጠን/Settled Amount</td><td>1,500.00 Birr</td></tr>
        <tr><td>ጠቅላላ የተከፈለ/Total Paid Amount</td><td>1,500.00 Birr</td></tr>
      </table></body></html>
    `;

    const fetchImpl = vi.fn(async () =>
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    ) as unknown as typeof fetch;

    const provider = new TelebirrProvider({ fetchImpl, skipPrimary: false });
    const result = await provider.verify({ reference: 'CJU5RZ5NM3' });

    expect(result.outcome).toBe('FOUND');
    expect(result.payment?.amount).toBe(1500);
    expect(result.payment?.currency).toBe('ETB');
    expect(result.payment?.metadata.payerName).toContain('Abebe');
    expect(fetchImpl).toHaveBeenCalled();
  });
});
