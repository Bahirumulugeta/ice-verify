import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const steps = [
  {
    step: '01',
    title: 'Submit reference',
    body: 'Your backend sends a provider name, transaction reference, and optional expected amount or receiver.',
  },
  {
    step: '02',
    title: 'Provider lookup',
    body: 'ICE routes the request to the correct payment provider adapter and retrieves transaction details.',
  },
  {
    step: '03',
    title: 'Validate & score',
    body: 'We compare expected vs actual values, detect duplicates, and compute a risk assessment.',
  },
  {
    step: '04',
    title: 'Deliver result',
    body: 'Receive a structured verification response and optional webhook events for your order flow.',
  },
];

export const metadata = { title: 'How it Works' };

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="ice">Architecture</Badge>
          <h1 className="mt-4 font-display text-4xl font-semibold text-ink">How ICE Verification works</h1>
          <p className="mt-4 text-lg text-ink-muted">
            A single verification layer between your checkout and dozens of payment rails across
            East Africa and beyond.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {steps.map((item) => (
            <Card key={item.step} padding="lg">
              <span className="font-display text-3xl font-semibold text-ice/40">{item.step}</span>
              <h2 className="mt-4 font-display text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-surface-border bg-ink p-8 text-white sm:p-12">
          <h2 className="font-display text-2xl font-semibold">Ready to integrate?</h2>
          <p className="mt-2 max-w-xl text-white/70">
            Start with the demo provider, then switch to live credentials when your provider
            integrations are approved.
          </p>
          <Link
            href="/developers"
            className="mt-6 inline-flex rounded-lg bg-ice px-5 py-2.5 text-sm font-medium text-ink hover:bg-ice-light"
          >
            View developer docs
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
