'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { DEMO_API_KEY } from '@/lib/constants';
import { getSnippet, type SnippetLanguage } from '@/lib/code-snippets';
import { api, type VerificationData } from '@/services/api';

const SNIPPET_TABS: Array<{ id: SnippetLanguage; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
];

export function PlaygroundPanel() {
  const [provider, setProvider] = useState('demo');
  const [reference, setReference] = useState('DEMO-VALID-001');
  const [snippetLang, setSnippetLang] = useState<SnippetLanguage>('typescript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationData | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);

  const snippetParams = {
    apiKey: DEMO_API_KEY,
    provider,
    reference,
  };

  async function runRequest() {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await api.createVerification({
      provider,
      reference,
    });

    setRawResponse(response);

    if (!response.success) {
      setError(response.error.message);
      setLoading(false);
      return;
    }

    setResult(response.data);
    setLoading(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Request builder" description="Configure and send a live API request." />
          <div className="space-y-4">
            <Select
              label="Provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              options={[
                { value: 'demo', label: 'Demo' },
                { value: 'telebirr', label: 'Telebirr' },
                { value: 'cbe', label: 'CBE' },
              ]}
            />
            <Input
              label="Reference / Transaction number"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="DEMO-VALID-001 or Telebirr receipt no."
            />
            <p className="text-xs text-ink-subtle">
              Amount and receiver are returned by the provider. Optional expected checks remain available via API.
            </p>
            <Button variant="ice" onClick={runRequest} disabled={loading}>
              {loading ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Code snippet" />
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
      </div>

      <div className="space-y-6">
        {loading && <LoadingState message="Waiting for API response…" />}
        {error && <ErrorState message={error} onRetry={runRequest} />}

        {result && (
          <Card>
            <CardHeader title="Response" />
            <div className="mb-4">
              <StatusBadge status={result.status} />
            </div>
            <CodeBlock code={JSON.stringify(rawResponse, null, 2)} language="json" />
          </Card>
        )}

        {!loading && !result && !error && (
          <Card className="flex min-h-[240px] items-center justify-center">
            <p className="text-sm text-ink-muted">Run a request to see the live API response</p>
          </Card>
        )}
      </div>
    </div>
  );
}
