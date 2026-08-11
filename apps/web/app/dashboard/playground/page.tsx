import { PlaygroundPanel } from '@/features/playground/PlaygroundPanel';

export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">API Playground</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Send live verification requests and inspect responses.
        </p>
      </div>
      <PlaygroundPanel />
    </div>
  );
}
