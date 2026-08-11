import * as cheerio from 'cheerio';
import type { TelebirrReceipt } from './types.js';

function extractSettledAmountRegex(htmlContent: string): string | null {
  const patterns = [
    /የተከፈለው\s+መጠን\/Settled\s+Amount.*?<\/td>\s*<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
    /<tr[^>]*>.*?የተከፈለው\s+መጠን\/Settled\s+Amount.*?<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/is,
    /Settled\s+Amount.*?([\d,]+(?:\.\d+)?\s+Birr)/is,
  ];
  for (const pattern of patterns) {
    const match = htmlContent.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractServiceFeeRegex(htmlContent: string): string | null {
  const pattern =
    /የአገልግሎት\s+ክፍያ\/Service\s+fee(?!\s+ተ\.እ\.ታ).*?<\/td>\s*<td[^>]*>\s*([\d,]+(?:\.\d+)?\s+Birr)/i;
  const match = htmlContent.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractReceiptNoRegex(htmlContent: string): string | null {
  const pattern =
    /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i;
  const match = htmlContent.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractDateRegex(htmlContent: string): string | null {
  const match = htmlContent.match(/(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
  return match?.[1]?.trim() ?? null;
}

function extractWithRegex(
  htmlContent: string,
  labelPattern: string,
  valuePattern = '([^<]+)',
): string | null {
  const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedLabel}.*?<\\/td>\\s*<td[^>]*>\\s*${valuePattern}`, 'i');
  const match = htmlContent.match(pattern);
  return match?.[1]?.replace(/<[^>]*>/g, '').trim() ?? null;
}

export function scrapeTelebirrReceipt(html: string): TelebirrReceipt {
  const $ = cheerio.load(html);

  const getText = (selector: string): string => $(selector).next().text().trim();

  const getTextWithFallback = (labelText: string): string => {
    const regexResult = extractWithRegex(html, labelText);
    if (regexResult) return regexResult;
    return getText(`td:contains("${labelText}")`);
  };

  const getPaymentDate = (): string => {
    const regexDate = extractDateRegex(html);
    if (regexDate) return regexDate;
    return $('.receipttableTd')
      .filter((_, el) => $(el).text().includes('-202'))
      .first()
      .text()
      .trim();
  };

  const getReceiptNo = (): string => {
    const regexReceiptNo = extractReceiptNoRegex(html);
    if (regexReceiptNo) return regexReceiptNo;
    return $('td.receipttableTd.receipttableTd2').eq(1).text().trim();
  };

  const getSettledAmount = (): string => {
    const regexAmount = extractSettledAmountRegex(html);
    if (regexAmount) return regexAmount;

    let amount = $('td.receipttableTd.receipttableTd2')
      .filter((_, el) => {
        const prevTd = $(el).prev();
        return prevTd.text().includes('የተከፈለው መጠን') || prevTd.text().includes('Settled Amount');
      })
      .text()
      .trim();

    if (!amount) {
      amount = $('tr')
        .filter((_, el) => {
          const text = $(el).find('td').first().text();
          return text.includes('የተከፈለው መጠን') || text.includes('Settled Amount');
        })
        .find('td')
        .last()
        .text()
        .trim();
    }

    return amount;
  };

  const getServiceFee = (): string => {
    const regexFee = extractServiceFeeRegex(html);
    if (regexFee) return regexFee;

    let fee = $('td.receipttableTd1')
      .filter((_, el) => {
        const text = $(el).text();
        return (
          (text.includes('የአገልግሎት ክፍያ') || text.includes('Service fee')) &&
          !text.includes('ተ.እ.ታ') &&
          !text.includes('VAT')
        );
      })
      .next('td.receipttableTd.receipttableTd2')
      .text()
      .trim();

    if (!fee) {
      fee = $('tr')
        .filter((_, el) => {
          const text = $(el).text();
          return (
            (text.includes('የአገልግሎት ክፍያ') || text.includes('Service fee')) &&
            !text.includes('ተ.እ.ታ') &&
            !text.includes('VAT')
          );
        })
        .find('td')
        .last()
        .text()
        .trim();
    }

    return fee;
  };

  let creditedPartyName = getTextWithFallback('የገንዘብ ተቀባይ ስም/Credited Party name');
  let creditedPartyAccountNo = getTextWithFallback(
    'የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no',
  );
  let bankName = '';

  const bankAccountNumberRaw = getTextWithFallback('የባንክ አካውንት ቁጥር/Bank account number');
  if (bankAccountNumberRaw) {
    bankName = creditedPartyName;
    const match = bankAccountNumberRaw.match(/(\d+)\s+(.*)/);
    if (match) {
      creditedPartyAccountNo = match[1].trim();
      creditedPartyName = match[2].trim();
    }
  }

  return {
    payerName: getTextWithFallback('የከፋይ ስም/Payer Name'),
    payerTelebirrNo: getTextWithFallback('የከፋይ ቴሌብር ቁ./Payer telebirr no.'),
    creditedPartyName,
    creditedPartyAccountNo,
    transactionStatus: getTextWithFallback('የክፍያው ሁኔታ/transaction status'),
    receiptNo: getReceiptNo(),
    paymentDate: getPaymentDate(),
    settledAmount: getSettledAmount(),
    serviceFee: getServiceFee(),
    serviceFeeVAT: getTextWithFallback('የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT'),
    totalPaidAmount: getTextWithFallback('ጠቅላላ የተከፈለ/Total Paid Amount'),
    bankName,
    customerNote: getTextWithFallback('የደንበኛ መልዕክት/Customer Note'),
  };
}

export function parseTelebirrJson(jsonData: unknown): TelebirrReceipt | null {
  if (!jsonData || typeof jsonData !== 'object') return null;
  const payload = jsonData as { success?: boolean; data?: Partial<TelebirrReceipt> };
  if (!payload.success || !payload.data) return null;

  const data = payload.data;
  return {
    payerName: data.payerName ?? '',
    payerTelebirrNo: data.payerTelebirrNo ?? '',
    creditedPartyName: data.creditedPartyName ?? '',
    creditedPartyAccountNo: data.creditedPartyAccountNo ?? '',
    transactionStatus: data.transactionStatus ?? '',
    receiptNo: data.receiptNo ?? '',
    paymentDate: data.paymentDate ?? '',
    settledAmount: data.settledAmount ?? '',
    serviceFee: data.serviceFee ?? '',
    serviceFeeVAT: data.serviceFeeVAT ?? '',
    totalPaidAmount: data.totalPaidAmount ?? '',
    bankName: data.bankName ?? '',
    customerNote: data.customerNote ?? '',
  };
}
