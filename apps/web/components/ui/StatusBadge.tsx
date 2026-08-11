import { Badge } from './Badge';

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'ice' }
> = {
  VERIFIED: { label: 'Verified', variant: 'success' },
  verified: { label: 'Verified', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'warning' },
  pending: { label: 'Pending', variant: 'warning' },
  PROCESSING: { label: 'Processing', variant: 'ice' },
  processing: { label: 'Processing', variant: 'ice' },
  CREATED: { label: 'Created', variant: 'default' },
  created: { label: 'Created', variant: 'default' },
  NOT_FOUND: { label: 'Not Found', variant: 'danger' },
  not_found: { label: 'Not Found', variant: 'danger' },
  FAILED: { label: 'Failed', variant: 'danger' },
  failed: { label: 'Failed', variant: 'danger' },
  AMOUNT_MISMATCH: { label: 'Amount Mismatch', variant: 'danger' },
  amount_mismatch: { label: 'Amount Mismatch', variant: 'danger' },
  RECEIVER_MISMATCH: { label: 'Receiver Mismatch', variant: 'danger' },
  receiver_mismatch: { label: 'Receiver Mismatch', variant: 'danger' },
  DUPLICATE: { label: 'Duplicate', variant: 'warning' },
  duplicate: { label: 'Duplicate', variant: 'warning' },
  PROVIDER_UNAVAILABLE: { label: 'Provider Unavailable', variant: 'warning' },
  provider_unavailable: { label: 'Provider Unavailable', variant: 'warning' },
  INVALID_REQUEST: { label: 'Invalid', variant: 'danger' },
  invalid_request: { label: 'Invalid', variant: 'danger' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
