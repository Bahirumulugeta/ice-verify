import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { DemoScenarios } from '@/features/demo/DemoScenarios';

export const metadata = { title: 'Demo Scenarios' };

export default function DemoPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-semibold text-ink">Interactive demo</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Run live verifications against documented demo scenarios. Each scenario maps to a
            real API response shape your integration will handle in production.
          </p>
        </div>
        <DemoScenarios />
      </main>
      <SiteFooter />
    </>
  );
}
