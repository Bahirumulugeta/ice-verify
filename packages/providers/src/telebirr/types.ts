export interface TelebirrReceipt {
  payerName: string;
  payerTelebirrNo: string;
  creditedPartyName: string;
  creditedPartyAccountNo: string;
  transactionStatus: string;
  receiptNo: string;
  paymentDate: string;
  settledAmount: string;
  serviceFee: string;
  serviceFeeVAT: string;
  totalPaidAmount: string;
  bankName: string;
  customerNote: string;
}

export interface TelebirrProxyDescriptor {
  id: string;
  label: string;
  url: string;
  role: 'preferred' | 'fallback';
}

export interface TelebirrProviderOptions {
  primaryReceiptBaseUrl?: string;
  fallbackProxies?: string[];
  proxyLabels?: string[];
  proxyKey?: string;
  skipPrimary?: boolean;
  timeoutMs?: number;
  totalTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}
