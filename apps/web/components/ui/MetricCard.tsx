import { cn } from '@/lib/cn';

export function MetricCard({
  label,
  value,
  change,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-surface-border bg-surface-raised p-5 shadow-soft',
        className,
      )}
    >
      <p className="text-sm font-medium text-ink-subtle">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {change && (
        <p
          className={cn(
            'mt-1 text-xs font-medium',
            trend === 'up' && 'text-emerald-600',
            trend === 'down' && 'text-red-600',
            trend === 'neutral' && 'text-ink-subtle',
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
