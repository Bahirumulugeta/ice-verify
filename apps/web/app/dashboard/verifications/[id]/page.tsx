'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useVerification } from '@/hooks/useVerifications';
import { formatCurrency, formatDate } from '@/lib/cn';

export default function VerificationDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const query = useVerification(id);

  if (query.isLoading) return <LoadingState message="Loading verification…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={query.error?.message ?? 'Verification not found'}
        onRetry={() => query.refetch()}
      />
    );
  }

  const v = query.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/dashboard/verifications" className="hover:text-ink">
          Verifications
        </Link>
        <span>/</span>
        <span className="font-mono text-ink">{v.reference}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">{v.reference}</h1>
        <StatusBadge status={v.status} />
        {v.verified && <Badge variant="success">Verified</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-ink-subtle">Verification ID</dt>
              <dd className="mt-1 font-mono text-sm">{v.verificationId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-subtle">Provider</dt>
              <dd className="mt-1 capitalize">{v.provider}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-subtle">Environment</dt>
              <dd className="mt-1 capitalize">{v.environment ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-subtle">Created</dt>
              <dd className="mt-1">{v.createdAt ? formatDate(v.createdAt) : '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Amounts" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-ink-subtle">Expected</dt>
              <dd className="mt-1 font-medium">
                {v.expectedAmount !== undefined
                  ? formatCurrency(v.expectedAmount, v.currency ?? 'ETB')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-subtle">Actual</dt>
              <dd className="mt-1 font-medium">
                {v.actualAmount !== undefined
                  ? formatCurrency(v.actualAmount, v.currency ?? 'ETB')
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        {v.risk && (
          <Card className="lg:col-span-2">
            <CardHeader title="Risk assessment" />
            <div className="flex items-center gap-4">
              <span className="font-display text-3xl font-semibold">{v.risk.score}</span>
              <Badge variant={v.risk.level === 'low' ? 'success' : 'warning'}>
                {v.risk.level} risk
              </Badge>
            </div>
            {v.risk.flags.length > 0 && (
              <ul className="mt-4 space-y-2">
                {v.risk.flags.map((flag) => (
                  <li key={flag.code} className="text-sm text-ink-muted">
                    <span className="font-medium text-ink">{flag.code}:</span> {flag.message}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
