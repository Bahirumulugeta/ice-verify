'use client';

import { Card } from '@/components/ui/Card';
import { ProviderBadge } from '@/components/ui/ProviderBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { useProviders } from '@/hooks/useVerifications';

export default function DashboardProvidersPage() {
  const query = useProviders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Providers</h1>
        <p className="mt-1 text-sm text-ink-muted">Connected payment providers for your account.</p>
      </div>

      {query.isLoading && <LoadingSkeleton rows={4} />}
      {query.isError && (
        <ErrorState
          message={query.error?.message ?? 'Failed to load providers'}
          onRetry={() => query.refetch()}
        />
      )}
      {query.data?.length === 0 && (
        <EmptyState title="No providers" description="No payment providers are configured yet." />
      )}
      {query.data && query.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {query.data.map((provider) => (
            <Card key={provider.name} padding="lg">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {provider.displayName}
                  </h2>
                  <p className="mt-1 text-sm capitalize text-ink-muted">{provider.name}</p>
                </div>
                <ProviderBadge
                  provider={provider.name}
                  status={provider.integrationStatus}
                />
              </div>
              {provider.capabilities && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(provider.capabilities)
                    .filter(([, v]) => v)
                    .slice(0, 4)
                    .map(([cap]) => (
                      <li
                        key={cap}
                        className="rounded-md bg-ink/5 px-2 py-1 text-xs text-ink-muted"
                      >
                        {cap.replace(/([A-Z])/g, ' $1').trim()}
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
