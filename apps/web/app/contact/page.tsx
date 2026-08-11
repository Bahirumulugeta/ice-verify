'use client';

import { useState } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ink">Contact us</h1>
        <p className="mt-4 text-ink-muted">
          Questions about integration, pricing, or enterprise requirements? We&apos;d love to hear from you.
        </p>

        <Card className="mt-10">
          {submitted ? (
            <div className="py-8 text-center">
              <p className="font-display text-lg font-semibold text-ink">Message sent</p>
              <p className="mt-2 text-sm text-ink-muted">We&apos;ll get back to you within one business day.</p>
            </div>
          ) : (
            <>
              <CardHeader title="Send a message" />
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
              >
                <Input label="Name" name="name" required />
                <Input label="Email" name="email" type="email" required />
                <Input label="Company" name="company" />
                <div className="space-y-1.5">
                  <label htmlFor="message" className="block text-sm font-medium text-ink">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="w-full rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 text-sm focus:border-ice focus:outline-none focus:ring-2 focus:ring-ice/20"
                  />
                </div>
                <Button type="submit" variant="ice">
                  Send message
                </Button>
              </form>
            </>
          )}
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
