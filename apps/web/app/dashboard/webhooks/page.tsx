'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { TBody, TD, THead, TH, TR, Table } from '@/components/ui/Table';
import { useWebhooks } from '@/hooks/useVerifications';
import { formatDate } from '@/lib/cn';

export default function WebhooksPage() {
  const query = useWebhooks();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Webhooks</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Receive real-time events when verifications change state.
          </p>
        </div>
        <Button variant="ice" disabled>
          Add endpoint
        </Button>
      </div>

      <Card>
        {query.isLoading && <LoadingSkeleton rows={3} />}
        {query.isError && (
          <ErrorState
            message={query.error?.message ?? 'Failed to load webhooks'}
            onRetry={() => query.refetch()}
          />
        )}
        {query.data?.length === 0 && (
          <EmptyState
            title="No webhooks configured"
            description="Add an endpoint to receive verification events."
          />
        )}
        {query.data && query.data.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>URL</TH>
                <TH>Events</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {query.data.map((wh) => (
                <TR key={wh.id}>
                  <TD className="max-w-xs truncate font-mono text-sm">{wh.url}</TD>
                  <TD>{wh.events.length} events</TD>
                  <TD>
                    <Badge variant={wh.enabled ? 'success' : 'default'}>
                      {wh.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>{formatDate(wh.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
