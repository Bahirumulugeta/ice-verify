import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PricingPanel } from '@/features/pricing/PricingPanel';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold text-ink">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-ink-muted">
            Start free, scale as your verification volume grows.
          </p>
        </div>

        <PricingPanel />
      </main>
      <SiteFooter />
    </>
  );
}
