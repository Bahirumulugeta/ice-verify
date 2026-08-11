'use client';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { TBody, TD, THead, TH, TR, Table } from '@/components/ui/Table';
import { useAuditLogs } from '@/hooks/useVerifications';
import { formatDate } from '@/lib/cn';

export default function AuditPage() {
  const query = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Audit log</h1>
        <p className="mt-1 text-sm text-ink-muted">Immutable record of account and API activity.</p>
      </div>

      <Card>
        {query.isLoading && <LoadingSkeleton rows={6} />}
        {query.isError && (
          <ErrorState
            message={query.error?.message ?? 'Failed to load audit logs'}
            onRetry={() => query.refetch()}
          />
        )}
        {query.data?.length === 0 && (
          <EmptyState title="No audit events" description="Activity will appear here as you use the platform." />
        )}
        {query.data && query.data.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Action</TH>
                <TH>Resource</TH>
                <TH>Actor</TH>
                <TH>Time</TH>
              </TR>
            </THead>
            <TBody>
              {query.data.map((entry) => (
                <TR key={entry.id}>
                  <TD className="font-mono text-sm">{entry.action}</TD>
                  <TD>
                    {entry.resource}
                    {entry.resourceId && (
                      <span className="ml-1 text-ink-subtle">({entry.resourceId.slice(0, 8)}…)</span>
                    )}
                  </TD>
                  <TD className="capitalize">{entry.actorType.replace('_', ' ')}</TD>
                  <TD>{formatDate(entry.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
