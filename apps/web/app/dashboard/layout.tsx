import Link from 'next/link';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { APP_NAME } from '@/lib/constants';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-atmosphere">
      <header className="border-b border-surface-border bg-surface-raised/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[10px] font-bold text-white">
              ICE
            </span>
            <span className="text-sm font-semibold text-ink">{APP_NAME}</span>
          </Link>
          <Link href="/" className="text-sm text-ink-muted hover:text-ink">
            Back to site
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <DashboardNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
