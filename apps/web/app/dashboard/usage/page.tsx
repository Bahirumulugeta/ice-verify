'use client';

import { Card, CardHeader } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { useUsage } from '@/hooks/useVerifications';

export default function UsagePage() {
  const query = useUsage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Usage</h1>
        <p className="mt-1 text-sm text-ink-muted">Monitor verification volume and performance.</p>
      </div>

      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <LoadingSkeleton rows={1} />
          <LoadingSkeleton rows={1} />
          <LoadingSkeleton rows={1} />
        </div>
      )}
      {query.isError && (
        <ErrorState
          message={query.error?.message ?? 'Failed to load usage data'}
          onRetry={() => query.refetch()}
        />
      )}
      {query.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Total verifications"
              value={(
                query.data.metrics.verifications_total ??
                query.data.metrics.verifications ??
                0
              ).toLocaleString()}
            />
            <MetricCard
              label="Verified"
              value={(query.data.verificationStatus.VERIFIED ?? 0).toLocaleString()}
            />
            <MetricCard label="Period" value={`Last ${query.data.days} days`} />
          </div>

          <Card>
            <CardHeader title="Status breakdown" description={`Last ${query.data.days} days`} />
            {Object.keys(query.data.verificationStatus).length === 0 ? (
              <p className="text-sm text-ink-muted">No verification activity in this period.</p>
            ) : (
              <ul className="space-y-3">
                {Object.entries(query.data.verificationStatus).map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between rounded-lg border border-surface-border px-4 py-3"
                  >
                    <span className="text-ink">{status.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
