'use client';

import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage your account and notification preferences.</p>
      </div>

      <Card>
        <CardHeader title="Organization" />
        <form className="max-w-md space-y-4">
          <Input label="Organization name" defaultValue="Acme Commerce" />
          <Input label="Contact email" type="email" defaultValue="ops@example.com" />
          <Button variant="ice" type="button">
            Save changes
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Notifications" />
        <div className="max-w-md space-y-4">
          <Select
            label="Verification alerts"
            defaultValue="all"
            options={[
              { value: 'all', label: 'All verifications' },
              { value: 'failures', label: 'Failures only' },
              { value: 'none', label: 'None' },
            ]}
          />
          <Select
            label="Webhook failures"
            defaultValue="immediate"
            options={[
              { value: 'immediate', label: 'Immediate' },
              { value: 'daily', label: 'Daily digest' },
              { value: 'none', label: 'None' },
            ]}
          />
          <Button variant="secondary" type="button">
            Update preferences
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Danger zone" description="Irreversible account actions." />
        <Button variant="danger" type="button">
          Delete account
        </Button>
      </Card>
    </div>
  );
}
