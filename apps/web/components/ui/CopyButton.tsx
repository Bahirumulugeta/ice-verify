'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn('text-ink-subtle', className)}
      aria-label={copied ? 'Copied' : `Copy ${label}`}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}
