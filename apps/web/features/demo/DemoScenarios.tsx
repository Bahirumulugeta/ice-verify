'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { cn, formatCurrency, formatDate } from '@/lib/cn';
import { DEMO_API_KEY, DEMO_SCENARIOS, type DemoScenario } from '@/lib/constants';
import { getSnippet, type SnippetLanguage } from '@/lib/code-snippets';
import { api, type VerificationData } from '@/services/api';

const SNIPPET_TABS: Array<{ id: SnippetLanguage; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
];

interface ApiExchange {
  request: Record<string, unknown>;
  response: unknown;
  durationMs: number;
}

export function DemoScenarios() {
  const [selected, setSelected] = useState<DemoScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationData | null>(null);
  const [exchange, setExchange] = useState<ApiExchange | null>(null);
  const [snippetLang, setSnippetLang] = useState<SnippetLanguage>('curl');

  async function runScenario(scenario: DemoScenario) {
    setSelected(scenario);
    setLoading(true);
    setError(null);
    setResult(null);

    const payload: {
      provider: string;
      reference: string;
      expectedAmount?: number;
      currency?: string;
      expectedReceiver?: string;
    } = {
      provider: scenario.provider,
      reference: scenario.reference,
    };

    // Optional fulfillment checks — only for mismatch/duplicate demo scenarios.
    if ('expectedAmount' in scenario && scenario.expectedAmount != null) {
      payload.expectedAmount = scenario.expectedAmount;
    }
    if ('currency' in scenario && scenario.currency) {
      payload.currency = scenario.currency;
    }
    if ('expectedReceiver' in scenario && scenario.expectedReceiver) {
      payload.expectedReceiver = scenario.expectedReceiver;
    }

    const started = Date.now();
    const response = await api.createVerification(payload);
    const durationMs = Date.now() - started;

    setExchange({
      request: payload,
      response,
      durationMs,
    });

    if (!response.success) {
      setError(response.error.message);
      setLoading(false);
      return;
    }

    setResult(response.data);
    setLoading(false);
  }

  const snippetParams = selected
    ? {
        apiKey: DEMO_API_KEY,
        provider: selected.provider,
        reference: selected.reference,
        ...('expectedAmount' in selected && selected.expectedAmount !== undefined
          ? { expectedAmount: selected.expectedAmount }
          : {}),
        ...('currency' in selected && selected.currency ? { currency: selected.currency } : {}),
        ...('expectedReceiver' in selected && selected.expectedReceiver
          ? { expectedReceiver: selected.expectedReceiver }
          : {}),
      }
    : null;

  const timeline = result
    ? [
        { step: 'Request received', time: result.createdAt, status: 'complete' },
        { step: 'Provider lookup', time: result.updatedAt, status: 'complete' },
        {
          step: 'Verification resolved',
          time: result.updatedAt,
          status: result.verified ? 'success' : 'failed',
        },
      ]
    : [];

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <h2 className="font-display text-xl font-semibold text-ink">Demo scenarios</h2>
        <p className="text-sm text-ink-muted">
          Click a scenario to run a live verification against the demo provider API.
        </p>
        <div className="space-y-2">
          {DEMO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => runScenario(scenario)}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-all',
                selected?.id === scenario.id
                  ? 'border-ice bg-ice/5 shadow-glow'
                  : 'border-surface-border bg-surface-raised hover:border-ice/30',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{scenario.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">{scenario.description}</p>
                </div>
                <Badge variant="ice">{scenario.id}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 lg:col-span-3">
        {!selected && (
          <Card className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-ink-muted">Select a scenario to run a live verification</p>
          </Card>
        )}

        {loading && <LoadingState message="Running verification…" />}
        {error && <ErrorState message={error} onRetry={() => selected && runScenario(selected)} />}

        {result && selected && (
          <>
            <Card>
              <CardHeader title="Result" description={`Scenario: ${selected.title}`} />
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={result.status} />
                  {result.verified ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="warning">Not verified</Badge>
                  )}
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-ink-subtle">Reference</dt>
                    <dd className="font-mono text-sm">{result.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-ink-subtle">Expected status</dt>
                    <dd>
                      <StatusBadge status={selected.expectedStatus} />
                    </dd>
                  </div>
                  {result.actualAmount !== undefined && (
                    <div>
                      <dt className="text-xs uppercase text-ink-subtle">Actual amount</dt>
                      <dd>{formatCurrency(result.actualAmount, result.currency ?? 'ETB')}</dd>
                    </div>
                  )}
                  {result.expectedAmount !== undefined && (
                    <div>
                      <dt className="text-xs uppercase text-ink-subtle">Expected amount</dt>
                      <dd>{formatCurrency(result.expectedAmount, result.currency ?? 'ETB')}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>

            <Card>
              <CardHeader title="Timeline" />
              <ol className="relative space-y-4 border-l border-ice/30 pl-6">
                {timeline.map((item, i) => (
                  <li key={i} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[1.6rem] flex h-3 w-3 rounded-full',
                        item.status === 'success' && 'bg-emerald-500',
                        item.status === 'failed' && 'bg-red-500',
                        item.status === 'complete' && 'bg-ice',
                      )}
                    />
                    <p className="text-sm font-medium text-ink">{item.step}</p>
                    {item.time && (
                      <p className="text-xs text-ink-subtle">{formatDate(item.time)}</p>
                    )}
                  </li>
                ))}
              </ol>
            </Card>

            {exchange && (
              <Card>
                <CardHeader
                  title="API exchange"
                  description={`Completed in ${exchange.durationMs}ms`}
                />
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-ink-subtle">Request</p>
                    <CodeBlock
                      code={JSON.stringify(exchange.request, null, 2)}
                      language="json"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-ink-subtle">Response</p>
                    <CodeBlock
                      code={JSON.stringify(exchange.response, null, 2)}
                      language="json"
                    />
                  </div>
                </div>
              </Card>
            )}

            {snippetParams && (
              <Card>
                <CardHeader title="Code snippets" />
                <div className="mb-4 flex flex-wrap gap-2">
                  {SNIPPET_TABS.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={snippetLang === tab.id ? 'ice' : 'secondary'}
                      size="sm"
                      onClick={() => setSnippetLang(tab.id)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
                <CodeBlock code={getSnippet(snippetLang, snippetParams)} language={snippetLang} />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
