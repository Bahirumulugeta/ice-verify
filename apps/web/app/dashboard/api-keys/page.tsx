'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { TBody, TD, THead, TH, TR, Table } from '@/components/ui/Table';
import { useApiKeys } from '@/hooks/useVerifications';
import { formatDate } from '@/lib/cn';

export default function ApiKeysPage() {
  const query = useApiKeys();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">API Keys</h1>
          <p className="mt-1 text-sm text-ink-muted">Manage authentication keys for your integration.</p>
        </div>
        <Button variant="ice" disabled>
          Create key
        </Button>
      </div>

      <Card>
        {query.isLoading && <LoadingSkeleton rows={4} />}
        {query.isError && (
          <ErrorState
            message={query.error?.message ?? 'Failed to load API keys'}
            onRetry={() => query.refetch()}
          />
        )}
        {query.data?.length === 0 && (
          <EmptyState
            title="No API keys"
            description="Create an API key to start making verification requests."
          />
        )}
        {query.data && query.data.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Prefix</TH>
                <TH>Environment</TH>
                <TH>Last used</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {query.data.map((key) => (
                <TR key={key.id}>
                  <TD className="font-medium text-ink">{key.name}</TD>
                  <TD className="font-mono text-sm">{key.prefix}…</TD>
                  <TD className="capitalize">{key.environment}</TD>
                  <TD>{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}</TD>
                  <TD>
                    <Badge variant={key.revokedAt ? 'danger' : 'success'}>
                      {key.revokedAt ? 'Revoked' : 'Active'}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
