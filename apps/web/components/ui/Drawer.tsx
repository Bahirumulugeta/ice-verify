'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-surface-border bg-surface-raised shadow-glow transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
            <h2 id="drawer-title" className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
              ✕
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </aside>
    </>
  );
}
