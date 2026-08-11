'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useBillingPlan, usePlans, useSelectPlan } from '@/hooks/useBilling';
import { cn } from '@/lib/cn';
import { DEMO_API_KEY, PRICING_TIERS } from '@/lib/constants';

function formatPlanPrice(priceMonthlyUsd: number | null, fallback: string) {
  if (priceMonthlyUsd === null) return 'Custom';
  if (priceMonthlyUsd === 0) return 'Free';
  return `$${priceMonthlyUsd}`;
}

export function PricingPanel() {
  const plansQuery = usePlans();
  const billingQuery = useBillingPlan();
  const selectPlan = useSelectPlan();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const currentPlanId = billingQuery.data?.plan.id ?? billingQuery.data?.subscription?.planId;

  async function handleSelectPlan(planId: 'starter' | 'growth' | 'enterprise') {
    setActionError(null);
    setPendingPlanId(planId);
    try {
      await selectPlan.mutateAsync(planId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select plan';
      if (message.toLowerCase().includes('unauthorized') || message.includes('401')) {
        setActionError('Sign in or configure your API key to change plans.');
      } else {
        setActionError(message);
      }
    } finally {
      setPendingPlanId(null);
    }
  }

  const apiPlans = plansQuery.data ?? [];

  return (
    <>
      {billingQuery.isLoading && (
        <div className="mt-8">
          <LoadingState message="Loading your current plan…" />
        </div>
      )}
      {billingQuery.isSuccess && currentPlanId && (
        <div className="mt-8 rounded-xl border border-ice/30 bg-ice/5 px-4 py-3 text-center text-sm text-ink">
          Current plan:{' '}
          <span className="font-semibold capitalize">{billingQuery.data.plan.name}</span>
          {billingQuery.data.subscription?.renewsAt && (
            <span className="text-ink-muted">
              {' '}
              · Renews {new Date(billingQuery.data.subscription.renewsAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {actionError && (
        <div className="mt-6">
          <ErrorState
            message={actionError}
            onRetry={() => setActionError(null)}
          />
          <p className="mt-2 text-center text-sm text-ink-muted">
            Using the demo key? Plans can be selected with{' '}
            <code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_DEMO_API_KEY</code>{' '}
            or{' '}
            <Link href="/login" className="text-ice-dark hover:underline">
              log in
            </Link>{' '}
            to your account.
          </p>
        </div>
      )}

      {plansQuery.isError && (
        <div className="mt-8">
          <ErrorState
            message={plansQuery.error?.message ?? 'Failed to load plans'}
            onRetry={() => plansQuery.refetch()}
          />
        </div>
      )}

      <div className="mt-16 grid gap-8 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const apiPlan = apiPlans.find((p) => p.id === tier.planId);
          const isCurrent = currentPlanId === tier.planId;
          const isHighlighted = 'highlighted' in tier && tier.highlighted;

          return (
            <Card
              key={tier.planId}
              padding="lg"
              className={cn(
                'relative flex flex-col',
                isHighlighted && 'border-ice shadow-glow',
                isCurrent && 'ring-2 ring-ice/40',
              )}
            >
              {isHighlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ice px-3 py-0.5 text-xs font-medium text-white">
                  Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-700">
                  Current
                </span>
              )}
              <h2 className="font-display text-xl font-semibold text-ink">{tier.name}</h2>
              <p className="mt-2 text-sm text-ink-muted">{tier.description}</p>
              <p className="mt-6 font-display text-4xl font-semibold text-ink">
                {apiPlan
                  ? formatPlanPrice(apiPlan.priceMonthlyUsd, tier.price)
                  : tier.price}
                {'period' in tier && tier.period && (
                  <span className="text-base font-normal text-ink-muted">{tier.period}</span>
                )}
              </p>
              {apiPlan?.verificationQuota != null && (
                <p className="mt-1 text-xs text-ink-subtle">
                  Up to {apiPlan.verificationQuota.toLocaleString()} verifications/mo
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-2">
                {(apiPlan?.features ?? tier.features).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-ink-muted">
                    <span className="text-ice">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {tier.planId === 'enterprise' ? (
                <Link href="/contact" className="mt-8 block">
                  <Button variant="secondary" className="w-full">
                    Contact sales
                  </Button>
                </Link>
              ) : (
                <Button
                  variant={isHighlighted ? 'ice' : 'secondary'}
                  className="mt-8 w-full"
                  disabled={isCurrent || selectPlan.isPending}
                  onClick={() => handleSelectPlan(tier.planId)}
                >
                  {pendingPlanId === tier.planId
                    ? 'Updating…'
                    : isCurrent
                      ? 'Current plan'
                      : 'Choose plan'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-ink-subtle">
        Plan changes use your API key ({DEMO_API_KEY.slice(0, 12)}… in demo mode).{' '}
        <Link href="/dashboard/api-keys" className="text-ice-dark hover:underline">
          Manage keys
        </Link>
      </p>
    </>
  );
}
