import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VerificationForm } from '@/features/verification/VerificationForm';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-atmosphere pattern-grid relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-mesh-pattern bg-[length:48px_48px] opacity-60" />
          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ice-dark">
                ICE
              </p>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-tight tracking-tight text-ink sm:text-6xl lg:text-7xl">
                ICE Verification
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-ink-muted text-balance sm:text-xl">
                Verify payments before you fulfill. Confirm Telebirr and bank transfers with a
                reference — amount and receiver details come back from the provider.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/verify">
                  <Button variant="ice" size="lg">
                    Verify Payment
                  </Button>
                </Link>
                <Link href="/developers">
                  <Button variant="secondary" size="lg">
                    Explore API
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="ghost" size="lg">
                    Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-ink py-20 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ice">Live demo</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                Try a verification now
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
                Pick a bank or wallet, paste a transaction reference, and see the payment details
                returned by the provider.
              </p>
            </div>
            <VerificationForm variant="live-demo" initialValues={{ provider: 'demo' }} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: 'Reference-first',
                body: 'Submit provider + reference only. Amount, payer, and receiver are returned from the receipt.',
              },
              {
                title: 'Claim & consume',
                body: 'Mark a payment as used so other systems cannot reuse the same receipt. Perfect for standalone payment verification.',
              },
              {
                title: 'Multi-provider',
                body: 'Telebirr, CBE, CBE Birr, BOA, Dashen, and Demo — with image upload, webhooks, and idempotent APIs.',
              },
            ].map((item) => (
              <Card key={item.title} padding="lg">
                <h2 className="font-display text-xl font-semibold text-ink">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
