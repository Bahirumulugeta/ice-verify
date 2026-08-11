import { describe, expect, it } from 'vitest';
import { scrapeTelebirrReceipt } from './scraper.js';
import { parseBirrAmount, isValidTelebirrReceipt } from './parse.js';

const SAMPLE_HTML = `
<html><body>
<table>
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
  <tr>
    <td>የተከፈለው መጠን/Settled Amount</td>
    <td>1,500.00 Birr</td>
  </tr>
  <tr>
    <td class="receipttableTd1">የአገልግሎት ክፍያ/Service fee</td>
    <td class="receipttableTd receipttableTd2">0.00 Birr</td>
  </tr>
  <tr>
    <td>የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT</td>
    <td>0.00 Birr</td>
  </tr>
  <tr>
    <td>ጠቅላላ የተከፈለ/Total Paid Amount</td>
    <td>1,500.00 Birr</td>
  </tr>
</table>
</body></html>
`;

describe('telebirr scraper', () => {
  it('extracts receipt fields from HTML', () => {
    const receipt = scrapeTelebirrReceipt(SAMPLE_HTML);
    expect(isValidTelebirrReceipt(receipt)).toBe(true);
    expect(receipt.payerName).toContain('Abebe');
    expect(receipt.receiptNo).toBe('CJU5RZ5NM3');
    expect(parseBirrAmount(receipt.settledAmount)).toBe(1500);
    expect(receipt.transactionStatus.toLowerCase()).toContain('completed');
  });
});
