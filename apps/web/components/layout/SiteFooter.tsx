import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

const footerLinks = {
  Product: [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/providers', label: 'Providers' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/status', label: 'Status' },
  ],
  Developers: [
    { href: '/developers', label: 'API Overview' },
    { href: '/docs', label: 'Documentation' },
    { href: '/demo', label: 'Demo Scenarios' },
    { href: '/dashboard/playground', label: 'Playground' },
  ],
  Company: [
    { href: '/security', label: 'Security' },
    { href: '/contact', label: 'Contact' },
    { href: '/login', label: 'Sign in' },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-surface-border bg-ink text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ice text-xs font-bold tracking-wider text-ink">
                ICE
              </span>
              <span className="font-display text-lg font-semibold text-white">{APP_NAME}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Provider-agnostic payment verification for modern commerce in emerging markets.
            </p>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
                {section}
              </h3>
              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-ice-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-white/40">Built for payment infrastructure teams.</p>
        </div>
      </div>
    </footer>
  );
}
