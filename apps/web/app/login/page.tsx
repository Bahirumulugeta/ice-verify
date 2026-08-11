'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/ErrorState';
import { api } from '@/services/api';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    const result = await api.login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error?.message ?? 'Login failed');
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
        <Card padding="lg">
          <CardHeader
            title="Sign in"
            description="Access your ICE Verification dashboard."
          />
          {error && (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" name="email" type="email" required autoComplete="email" />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="ice" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-ink-muted">
            Demo: demo@iceverification.dev / demo-password-change-me
          </p>
          <p className="mt-6 text-center text-sm text-ink-muted">
            No account?{' '}
            <Link href="/contact" className="font-medium text-ice-dark hover:underline">
              Contact sales
            </Link>
          </p>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
