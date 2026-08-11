'use client';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useHealth, useProviderHealth } from '@/hooks/useVerifications';

export default function StatusPage() {
  const health = useHealth();
  const providerHealth = useProviderHealth();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ink">System status</h1>
        <p className="mt-4 text-ink-muted">Real-time health of ICE Verification services.</p>

        <div className="mt-10 space-y-6">
          <Card>
            <CardHeader title="API" />
            {health.isLoading && <LoadingState />}
            {health.isError && (
              <ErrorState message={health.error?.message ?? 'Unable to reach API'} onRetry={() => health.refetch()} />
            )}
            {health.data && (
              <div className="flex items-center gap-3">
                <Badge variant="success">Operational</Badge>
                <span className="text-sm text-ink-muted">
                  {health.data.service} v{health.data.version}
                </span>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Providers" />
            {providerHealth.isLoading && <LoadingState />}
            {providerHealth.isError && (
              <ErrorState
                message={providerHealth.error?.message ?? 'Unable to fetch provider health'}
                onRetry={() => providerHealth.refetch()}
              />
            )}
            {providerHealth.data && (
              <ul className="space-y-3">
                {providerHealth.data.map((p) => (
                  <li
                    key={p.provider}
                    className="flex items-center justify-between rounded-lg border border-surface-border px-4 py-3"
                  >
                    <span className="font-medium capitalize text-ink">{p.provider}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ink-subtle">{p.latencyMs}ms</span>
                      <Badge variant={p.healthy ? 'success' : 'danger'}>
                        {p.healthy ? 'Healthy' : 'Degraded'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
