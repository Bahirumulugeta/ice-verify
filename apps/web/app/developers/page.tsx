import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { API_BASE_URL, DEMO_API_KEY } from '@/lib/constants';
import { generateTsSnippet } from '@/lib/code-snippets';

export const metadata = { title: 'Developers' };

export default function DevelopersPage() {
  const snippet = generateTsSnippet({
    apiKey: DEMO_API_KEY,
    provider: 'demo',
    reference: 'DEMO-VALID-001',
    expectedAmount: 1500,
    currency: 'ETB',
    expectedReceiver: '0912345678',
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold text-ink">Developer API</h1>
          <p className="mt-4 text-lg text-ink-muted">
            RESTful endpoints with typed SDKs, idempotency, and webhook events. Base URL:{' '}
            <code className="rounded bg-ink/5 px-1.5 py-0.5 text-sm">{API_BASE_URL}</code>
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Card padding="lg">
            <h2 className="font-display text-xl font-semibold text-ink">Quick start</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
              <li>Create an API key in the dashboard</li>
              <li>Send a POST to /api/v1/verifications</li>
              <li>Handle verification status in your order flow</li>
              <li>Subscribe to webhooks for async updates</li>
            </ol>
            <div className="mt-6 flex gap-3">
              <Link href="/docs">
                <Button variant="secondary">Read docs</Button>
              </Link>
              <Link href="/demo">
                <Button variant="ice">Try demo</Button>
              </Link>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-xl font-semibold text-ink">Endpoints</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                'POST /api/v1/verifications',
                'GET /api/v1/verifications/:id',
                'GET /api/v1/verifications',
                'POST /api/v1/verifications/batch',
                'GET /api/v1/providers',
              ].map((ep) => (
                <li key={ep} className="font-mono text-ink-muted">
                  {ep}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">Example</h2>
          <div className="mt-4">
            <CodeBlock code={snippet} language="typescript" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
