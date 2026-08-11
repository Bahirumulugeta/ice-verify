import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card } from '@/components/ui/Card';

const practices = [
  { title: 'Encryption in transit', body: 'TLS 1.2+ for all API and dashboard traffic.' },
  { title: 'API key hashing', body: 'Keys stored with peppered hashes — secrets shown once at creation.' },
  { title: 'SSRF protection', body: 'Webhook URLs validated against private network ranges.' },
  { title: 'Audit logging', body: 'Immutable audit trail for keys, webhooks, and verification events.' },
  { title: 'Rate limiting', body: 'Per-key rate limits with configurable windows.' },
  { title: 'Environment isolation', body: 'Test and live credentials operate in separate namespaces.' },
];

export const metadata = { title: 'Security' };

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ink">Security</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-muted">
          Payment verification demands the highest trust bar. ICE is built with security as a
          first-class requirement, not an afterthought.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {practices.map((item) => (
            <Card key={item.title} padding="lg">
              <h2 className="font-display text-lg font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
