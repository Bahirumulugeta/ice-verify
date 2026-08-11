'use client';

import { Card } from '@/components/ui/Card';
import { VerificationsTable } from '@/features/dashboard/VerificationsTable';

export default function VerificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Verifications</h1>
        <p className="mt-1 text-sm text-ink-muted">Search, filter, and review all payment verifications.</p>
      </div>

      <Card>
        <VerificationsTable />
      </Card>
    </div>
  );
}
