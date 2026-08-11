import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { VerificationForm } from '@/features/verification/VerificationForm';

export const metadata = { title: 'Verify Payment' };

export default function VerifyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink">Verify a payment</h1>
          <p className="mt-2 text-ink-muted">
            Submit a transaction reference to confirm payment details with the provider.
          </p>
        </div>
        <VerificationForm />
      </main>
      <SiteFooter />
    </>
  );
}
