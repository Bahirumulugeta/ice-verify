import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Card } from '@/components/ui/Card';
import { ProviderBadge } from '@/components/ui/ProviderBadge';
import { PROVIDERS } from '@/lib/constants';

export const metadata = { title: 'Providers' };

export default function ProvidersPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ink">Payment providers</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-muted">
          Connect once to ICE and verify payments across mobile money, bank transfers, and digital
          wallets.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((provider) => (
            <Card key={provider.name} padding="lg">
              <div className="flex items-start justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">{provider.displayName}</h2>
                <ProviderBadge provider={provider.name} status={provider.status} />
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                {provider.status === 'available'
                  ? 'Available for verification in sandbox and production.'
                  : 'Integration in progress. Contact us for early access.'}
              </p>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
