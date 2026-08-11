import { Badge } from './Badge';

export function ProviderBadge({
  provider,
  status,
}: {
  provider: string;
  status?: 'available' | 'pending' | 'disabled';
}) {
  const variant =
    status === 'available' ? 'success' : status === 'pending' ? 'warning' : 'default';

  return (
    <Badge variant={variant} className="capitalize">
      {provider}
    </Badge>
  );
}
