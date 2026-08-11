import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { API_BASE_URL, DEMO_API_KEY } from '@/lib/constants';

const sections = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'auth', title: 'Authentication' },
  { id: 'verify-reference', title: 'Verify by reference' },
  { id: 'provider-params', title: 'Provider-specific params' },
  { id: 'claims', title: 'Claim / consume payments' },
  { id: 'image-upload', title: 'Image upload' },
  { id: 'idempotency', title: 'Idempotency' },
  { id: 'webhooks', title: 'Webhooks' },
  { id: 'rate-limits', title: 'Rate limits' },
  { id: 'errors', title: 'Errors' },
] as const;

export const metadata = { title: 'Documentation' };

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                On this page
              </p>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-atmosphere-warm hover:text-ink"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <h1 className="font-display text-4xl font-semibold text-ink">API documentation</h1>
            <p className="mt-4 text-lg text-ink-muted">
              Integrate ICE Verification to confirm Ethiopian bank and mobile-money payments before
              fulfilling orders.
            </p>
            <p className="mt-2 text-sm text-ink-subtle">
              Base URL: <code className="rounded bg-ink/5 px-1.5 py-0.5">{API_BASE_URL}</code>
            </p>

            <section id="getting-started" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Getting started</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Create an API key from the dashboard, then verify a payment by sending{' '}
                <code className="text-ink">provider</code> and{' '}
                <code className="text-ink">reference</code> to the verifications endpoint. Use the
                demo provider with references like <code className="text-ink">DEMO-VALID-001</code>{' '}
                in test mode.
              </p>
              <div className="mt-4">
                <CodeBlock
                  language="bash"
                  code={`curl '${API_BASE_URL}/api/v1/health'`}
                />
              </div>
            </section>

            <section id="auth" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Authentication</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Authenticated routes require a Bearer token. Keys are scoped to{' '}
                <code className="text-ink">test</code> or <code className="text-ink">live</code>{' '}
                environments. Public routes (health, plans) do not require auth.
              </p>
              <div className="mt-4">
                <CodeBlock
                  language="http"
                  code={`Authorization: Bearer ${DEMO_API_KEY}`}
                />
              </div>
            </section>

            <section id="verify-reference" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Verify by reference</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Look up a payment by provider and transaction reference. Optionally pass expected
                amount/receiver for mismatch detection.
              </p>
              <div className="mt-4 space-y-4">
                <CodeBlock
                  language="json"
                  code={`POST /api/v1/verifications

{
  "provider": "telebirr",
  "reference": "CJU5RZ5NM3"
}`}
                />
                <CodeBlock
                  language="bash"
                  code={`curl -X POST '${API_BASE_URL}/api/v1/verifications' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "provider": "demo",
    "reference": "DEMO-VALID-001"
  }'`}
                />
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "data": {
    "verificationId": "ver_abc123",
    "status": "VERIFIED",
    "verified": true,
    "provider": "demo",
    "reference": "DEMO-VALID-001",
    "actualAmount": 1500,
    "currency": "ETB",
    "payment": {
      "payerName": "John Doe",
      "creditedPartyName": "Merchant Account",
      "transactionDate": "2026-08-08T10:30:00.000Z"
    },
    "risk": { "score": 0.1, "level": "LOW", "flags": [] }
  }
}`}
                />
              </div>
            </section>

            <section id="provider-params" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Provider-specific params
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Some providers require extra fields alongside the reference:
              </p>
              <ul className="mt-4 space-y-3 text-sm text-ink-muted">
                <li>
                  <strong className="text-ink">CBE</strong> —{' '}
                  <code className="text-ink">accountSuffix</code>: last 8 digits of the account
                  number
                </li>
                <li>
                  <strong className="text-ink">Bank of Abyssinia (BOA)</strong> —{' '}
                  <code className="text-ink">accountSuffix</code>: last 5 digits
                </li>
                <li>
                  <strong className="text-ink">CBE Birr</strong> —{' '}
                  <code className="text-ink">phoneNumber</code>: wallet phone used for the transfer
                </li>
                <li>
                  <strong className="text-ink">Telebirr, Dashen, Demo</strong> — reference only
                </li>
              </ul>
              <div className="mt-4">
                <CodeBlock
                  language="json"
                  code={`{
  "provider": "cbe",
  "reference": "FT260808ABC123",
  "accountSuffix": "12345678"
}

{
  "provider": "cbebirr",
  "reference": "CBEB123456",
  "phoneNumber": "0912345678"
}`}
                />
              </div>
            </section>

            <section id="claims" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Claim / consume payments
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                After verifying a payment, claim it to mark the reference as consumed and block
                reuse across orders. Verifications with{' '}
                <code className="text-ink">rejectIfClaimed: true</code> (default) fail if already
                claimed.
              </p>
              <div className="mt-4 space-y-4">
                <CodeBlock
                  language="bash"
                  code={`curl -X POST '${API_BASE_URL}/api/v1/claims' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "provider": "demo",
    "reference": "DEMO-VALID-001",
    "verificationId": "ver_abc123"
  }'`}
                />
                <CodeBlock
                  language="json"
                  code={`GET /api/v1/claims/:provider/:reference

{
  "success": true,
  "data": {
    "provider": "demo",
    "reference": "DEMO-VALID-001",
    "claimed": true,
    "claim": { "id": "clm_xyz", "status": "CLAIMED", "claimedAt": "..." }
  }
}`}
                />
                <CodeBlock
                  language="bash"
                  code={`curl -X POST '${API_BASE_URL}/api/v1/claims/clm_xyz/release' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{ "reason": "Order cancelled" }'`}
                />
              </div>
            </section>

            <section id="image-upload" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Image upload</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Upload a receipt screenshot as multipart form data. Provide the extracted reference
                (and provider-specific fields). The API auto-verifies against the provider when{' '}
                <code className="text-ink">autoVerify=true</code> (default).
              </p>
              <div className="mt-4">
                <CodeBlock
                  language="bash"
                  code={`curl -X POST '${API_BASE_URL}/api/v1/verifications/image' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -F 'file=@receipt.png' \\
  -F 'provider=cbe' \\
  -F 'reference=FT260808ABC123' \\
  -F 'accountSuffix=12345678'`}
                />
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "data": {
    "extracted": {
      "provider": "cbe",
      "reference": "FT260808ABC123",
      "accountSuffix": "12345678"
    },
    "verification": { "status": "VERIFIED", "actualAmount": 1500, "currency": "ETB" }
  }
}`}
                />
              </div>
            </section>

            <section id="idempotency" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Idempotency</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Pass an <code className="text-ink">Idempotency-Key</code> header on POST requests to
                safely retry without creating duplicate verifications. Reusing a key with a different
                payload returns <code className="text-ink">409 IDEMPOTENCY_CONFLICT</code>.
              </p>
              <div className="mt-4">
                <CodeBlock
                  language="http"
                  code={`Idempotency-Key: order-12345-verify-v1`}
                />
              </div>
            </section>

            <section id="webhooks" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Webhooks</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Subscribe to events for async workflows:{' '}
                <code className="text-ink">verification.created</code>,{' '}
                <code className="text-ink">verification.completed</code>,{' '}
                <code className="text-ink">verification.failed</code>, and{' '}
                <code className="text-ink">verification.risk_detected</code>. Configure endpoints in
                the dashboard.
              </p>
            </section>

            <section id="rate-limits" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Rate limits</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Limits vary by plan. Exceeded limits return{' '}
                <code className="text-ink">429 RATE_LIMITED</code> with a{' '}
                <code className="text-ink">Retry-After</code> header. Monitor usage via{' '}
                <code className="text-ink">GET /api/v1/usage</code>.
              </p>
            </section>

            <section id="errors" className="mt-16 scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold text-ink">Errors</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                All errors use a consistent JSON envelope with <code className="text-ink">code</code>
                , <code className="text-ink">message</code>, and optional{' '}
                <code className="text-ink">requestId</code> for support.
              </p>
              <div className="mt-4">
                <CodeBlock
                  language="json"
                  code={`{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Payment not found for this reference",
    "requestId": "req_abc123"
  }
}`}
                />
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase text-ink-subtle">
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-muted">
                    <tr className="border-b border-surface-border">
                      <td className="py-2 pr-4 font-mono text-xs">UNAUTHORIZED</td>
                      <td className="py-2">Missing or invalid API key</td>
                    </tr>
                    <tr className="border-b border-surface-border">
                      <td className="py-2 pr-4 font-mono text-xs">INVALID_REQUEST</td>
                      <td className="py-2">Validation failed or missing required fields</td>
                    </tr>
                    <tr className="border-b border-surface-border">
                      <td className="py-2 pr-4 font-mono text-xs">PAYMENT_CLAIMED</td>
                      <td className="py-2">Reference already consumed by another order</td>
                    </tr>
                    <tr className="border-b border-surface-border">
                      <td className="py-2 pr-4 font-mono text-xs">PROVIDER_UNAVAILABLE</td>
                      <td className="py-2">Upstream bank/wallet temporarily unreachable</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
