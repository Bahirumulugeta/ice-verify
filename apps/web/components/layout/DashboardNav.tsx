'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { DASHBOARD_NAV } from '@/lib/constants';

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Dashboard navigation">
      {DASHBOARD_NAV.map((item) => {
        const active =
          'exact' in item && item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-ice/10 text-ice-dark'
                : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
