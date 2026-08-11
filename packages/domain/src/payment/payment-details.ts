import { Money } from './money.js';

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'UNKNOWN';

export interface PaymentDetailsProps {
  reference: string;
  provider: string;
  amount: number;
  currency: string;
  sender?: string | null;
  receiver?: string | null;
  transactionDate?: Date | null;
  status: PaymentStatus;
  providerTransactionId?: string | null;
  metadata?: Record<string, unknown>;
}

export class PaymentDetails {
  readonly reference: string;
  readonly provider: string;
  readonly money: Money;
  readonly sender: string | null;
  readonly receiver: string | null;
  readonly transactionDate: Date | null;
  readonly status: PaymentStatus;
  readonly providerTransactionId: string | null;
  readonly metadata: Record<string, unknown>;

  constructor(props: PaymentDetailsProps) {
    this.reference = props.reference.trim();
    this.provider = props.provider.trim().toLowerCase();
    this.money = new Money(props.amount, props.currency);
    this.sender = props.sender ?? null;
    this.receiver = props.receiver ?? null;
    this.transactionDate = props.transactionDate ?? null;
    this.status = props.status;
    this.providerTransactionId = props.providerTransactionId ?? null;
    this.metadata = props.metadata ?? {};
  }

  get amount(): number {
    return this.money.amount;
  }

  get currency(): string {
    return this.money.currency;
  }
}
