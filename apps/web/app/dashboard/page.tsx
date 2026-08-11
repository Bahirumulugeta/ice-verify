'use client';

import Link from 'next/link';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { TBody, TD, THead, TH, TR, Table } from '@/components/ui/Table';
import { useUsage, useVerifications } from '@/hooks/useVerifications';
import { formatCurrency, formatRelativeTime } from '@/lib/cn';

export default function DashboardOverviewPage() {
  const usage = useUsage();
  const verifications = useVerifications({ limit: 5 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-muted">Your verification activity at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {usage.isLoading ? (
          <>
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={1} />
            <LoadingSkeleton rows={1} />
          </>
        ) : usage.isError ? (
          <>
            <MetricCard label="Verifications" value="—" change="API unavailable" trend="neutral" />
            <MetricCard label="Success rate" value="—" />
            <MetricCard label="Avg latency" value="—" />
            <MetricCard label="This period" value="—" />
          </>
        ) : (
          <>
            <MetricCard
              label="Verifications"
              value={(
                usage.data?.metrics?.verifications_total ??
                usage.data?.metrics?.verifications ??
                0
              ).toLocaleString()}
            />
            <MetricCard
              label="Verified"
              value={(
                usage.data?.verificationStatus?.VERIFIED ?? 0
              ).toLocaleString()}
            />
            <MetricCard
              label="Failed"
              value={(
                (usage.data?.verificationStatus?.FAILED ?? 0) +
                (usage.data?.verificationStatus?.NOT_FOUND ?? 0)
              ).toLocaleString()}
            />
            <MetricCard label="Period" value={`Last ${usage.data?.days ?? 7} days`} />
          </>
        )}
      </div>

      <Card>
        <CardHeader
          title="Recent verifications"
          action={
            <Link href="/dashboard/verifications" className="text-sm font-medium text-ice-dark hover:underline">
              View all
            </Link>
          }
        />

        {verifications.isLoading && <LoadingSkeleton rows={5} />}
        {verifications.isError && (
          <ErrorState
            message={verifications.error?.message ?? 'Failed to load verifications'}
            onRetry={() => verifications.refetch()}
          />
        )}
        {verifications.data?.items.length === 0 && (
          <EmptyState
            title="No verifications yet"
            description="Create your first verification from the playground or via the API."
            action={{ label: 'Open playground', href: '/dashboard/playground' }}
          />
        )}
        {verifications.data && verifications.data.items.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Reference</TH>
                <TH>Provider</TH>
                <TH>Status</TH>
                <TH>Amount</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {verifications.data.items.map((v) => (
                <TR key={v.verificationId}>
                  <TD>
                    <Link
                      href={`/dashboard/verifications/${v.verificationId}`}
                      className="font-mono text-sm text-ice-dark hover:underline"
                    >
                      {v.reference}
                    </Link>
                  </TD>
                  <TD className="capitalize">{v.provider}</TD>
                  <TD>
                    <StatusBadge status={v.status} />
                  </TD>
                  <TD>
                    {v.actualAmount !== undefined
                      ? formatCurrency(v.actualAmount, v.currency ?? 'ETB')
                      : '—'}
                  </TD>
                  <TD>{v.createdAt ? formatRelativeTime(v.createdAt) : '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
