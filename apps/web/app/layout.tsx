import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ICE Verification — Payment Verification Infrastructure',
    template: '%s | ICE Verification',
  },
  description:
    'Provider-agnostic payment verification for mobile money, bank transfers, and digital wallets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
