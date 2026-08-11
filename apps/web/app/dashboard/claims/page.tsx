'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { Select } from '@/components/ui/Select';
import { TBody, TD, THead, TH, TR, Table } from '@/components/ui/Table';
import { useClaimPayment, useClaims, useReleaseClaim } from '@/hooks/useClaims';
import { formatDate } from '@/lib/cn';
import { PROVIDERS } from '@/lib/constants';

export default function ClaimsPage() {
  const claimsQuery = useClaims();
  const claimMutation = useClaimPayment();
  const releaseMutation = useReleaseClaim();

  const [claimForm, setClaimForm] = useState({ provider: '', reference: '' });
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimError(null);
    if (!claimForm.provider || !claimForm.reference) {
      setClaimError('Provider and reference are required.');
      return;
    }
    try {
      await claimMutation.mutateAsync({
        provider: claimForm.provider,
        reference: claimForm.reference.trim(),
      });
      setClaimForm({ provider: '', reference: '' });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to claim payment');
    }
  }

  async function handleRelease(claimId: string) {
    try {
      await releaseMutation.mutateAsync({ claimId, reason: 'Released from dashboard' });
    } catch {
      // Error surfaced via mutation state if needed
    }
  }

  const providerOptions = [
    { value: '', label: 'Select provider', disabled: true },
    ...PROVIDERS.filter((p) => p.status === 'available').map((p) => ({
      value: p.name,
      label: p.displayName,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Payment claims</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Claim verified payments to prevent duplicate use across orders.
        </p>
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Claim a payment</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Mark a provider + reference as consumed after you have fulfilled the order.
        </p>
        <form onSubmit={handleClaim} className="mt-4 grid gap-4 sm:grid-cols-3">
          <Select
            label="Provider"
            value={claimForm.provider}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, provider: e.target.value }))}
            options={providerOptions}
            required
          />
          <Input
            label="Reference"
            value={claimForm.reference}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="Transaction reference"
            required
          />
          <div className="flex items-end">
            <Button type="submit" variant="ice" disabled={claimMutation.isPending} className="w-full">
              {claimMutation.isPending ? 'Claiming…' : 'Claim payment'}
            </Button>
          </div>
        </form>
        {claimError && <p className="mt-2 text-sm text-red-600">{claimError}</p>}
      </Card>

      <Card>
        {claimsQuery.isLoading && <LoadingSkeleton rows={6} />}
        {claimsQuery.isError && (
          <ErrorState
            message={claimsQuery.error?.message ?? 'Failed to load claims'}
            onRetry={() => claimsQuery.refetch()}
          />
        )}
        {claimsQuery.data?.length === 0 && (
          <EmptyState
            title="No claims yet"
            description="Claims appear here when you consume verified payments."
          />
        )}
        {claimsQuery.data && claimsQuery.data.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Reference</TH>
                <TH>Provider</TH>
                <TH>Status</TH>
                <TH>Verification</TH>
                <TH>Claimed</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {claimsQuery.data.map((claim) => (
                <TR key={claim.id}>
                  <TD className="font-mono text-sm">{claim.reference}</TD>
                  <TD className="capitalize">{claim.provider}</TD>
                  <TD>
                    <Badge
                      variant={
                        claim.status === 'CLAIMED'
                          ? 'success'
                          : claim.status === 'RELEASED'
                            ? 'default'
                            : 'warning'
                      }
                    >
                      {claim.status}
                    </Badge>
                  </TD>
                  <TD className="font-mono text-xs text-ink-subtle">
                    {claim.verificationId ? `${claim.verificationId.slice(0, 8)}…` : '—'}
                  </TD>
                  <TD>{formatDate(claim.claimedAt)}</TD>
                  <TD>
                    {claim.status === 'CLAIMED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={releaseMutation.isPending}
                        onClick={() => handleRelease(claim.id)}
                      >
                        Release
                      </Button>
                    )}
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
