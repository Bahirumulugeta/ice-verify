'use client';

import { cn } from '@/lib/cn';
import { CopyButton } from './CopyButton';

export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-ink/10 bg-ink text-ice-light', className)}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-white/50">
          {language ?? 'code'}
        </span>
        <CopyButton value={code} label="Copy" className="text-white/70 hover:text-white" />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
