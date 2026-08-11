export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const DEMO_API_KEY =
  process.env.NEXT_PUBLIC_DEMO_API_KEY ?? 'ice_test_demo_key_do_not_use_in_production';

export const APP_NAME = 'ICE Verification';

export const DEMO_SCENARIOS = [
  {
    id: 'DEMO-VALID-001',
    title: 'Valid payment',
    description: 'Lookup by reference — returns 1,500 ETB payment details',
    provider: 'demo',
    reference: 'DEMO-VALID-001',
    expectedStatus: 'VERIFIED',
  },
  {
    id: 'DEMO-PENDING-001',
    title: 'Pending payment',
    description: 'Payment still processing with provider',
    provider: 'demo',
    reference: 'DEMO-PENDING-001',
    expectedStatus: 'PENDING',
  },
  {
    id: 'DEMO-NOT-FOUND-001',
    title: 'Not found',
    description: 'Reference does not match any payment',
    provider: 'demo',
    reference: 'DEMO-NOT-FOUND-001',
    expectedStatus: 'NOT_FOUND',
  },
  {
    id: 'DEMO-AMOUNT-MISMATCH-001',
    title: 'Amount mismatch',
    description: 'Expected 1,500 ETB but provider reports 1,200 ETB',
    provider: 'demo',
    reference: 'DEMO-AMOUNT-MISMATCH-001',
    expectedAmount: 1500,
    currency: 'ETB',
    expectedReceiver: '0912345678',
    expectedStatus: 'AMOUNT_MISMATCH',
  },
  {
    id: 'DEMO-RECEIVER-MISMATCH-001',
    title: 'Receiver mismatch',
    description: 'Payment found but receiver account differs',
    provider: 'demo',
    reference: 'DEMO-RECEIVER-MISMATCH-001',
    expectedAmount: 1500,
    currency: 'ETB',
    expectedReceiver: '0912345678',
    expectedStatus: 'RECEIVER_MISMATCH',
  },
  {
    id: 'DEMO-DUPLICATE-001',
    title: 'Duplicate detection',
    description: 'Same payment verified twice within window',
    provider: 'demo',
    reference: 'DEMO-DUPLICATE-001',
    expectedAmount: 1500,
    currency: 'ETB',
    expectedReceiver: '0912345678',
    expectedStatus: 'DUPLICATE',
  },
  {
    id: 'DEMO-PROVIDER-ERROR-001',
    title: 'Provider error',
    description: 'Simulated upstream provider failure',
    provider: 'demo',
    reference: 'DEMO-PROVIDER-ERROR-001',
    expectedAmount: 1500,
    currency: 'ETB',
    expectedStatus: 'PROVIDER_UNAVAILABLE',
  },
] as const;

export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/providers', label: 'Providers' },
  { href: '/developers', label: 'Developers' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
] as const;

export const DASHBOARD_NAV = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/verifications', label: 'Verifications' },
  { href: '/dashboard/claims', label: 'Claims' },
  { href: '/dashboard/api-keys', label: 'API Keys' },
  { href: '/dashboard/providers', label: 'Providers' },
  { href: '/dashboard/webhooks', label: 'Webhooks' },
  { href: '/dashboard/usage', label: 'Usage' },
  { href: '/dashboard/playground', label: 'Playground' },
  { href: '/dashboard/audit', label: 'Audit Log' },
  { href: '/dashboard/settings', label: 'Settings' },
] as const;

export const PROVIDERS = [
  { name: 'demo', displayName: 'Demo Provider', status: 'available' as const },
  { name: 'telebirr', displayName: 'Telebirr', status: 'available' as const },
  { name: 'cbe', displayName: 'Commercial Bank of Ethiopia', status: 'available' as const },
  { name: 'cbebirr', displayName: 'CBE Birr', status: 'available' as const },
  { name: 'boa', displayName: 'Bank of Abyssinia', status: 'available' as const },
  { name: 'dashen', displayName: 'Dashen Bank', status: 'available' as const },
  { name: 'awash', displayName: 'Awash Bank', status: 'pending' as const },
] as const;

export const VERIFICATION_STATUSES = [
  'VERIFIED',
  'PENDING',
  'PROCESSING',
  'NOT_FOUND',
  'FAILED',
  'AMOUNT_MISMATCH',
  'RECEIVER_MISMATCH',
  'DUPLICATE',
  'PROVIDER_UNAVAILABLE',
] as const;

export const PRICING_TIERS = [
  {
    planId: 'starter' as const,
    name: 'Starter',
    price: 'Free',
    description: 'For development and early validation',
    features: ['1,000 verifications/mo', 'Demo provider', 'Community support', '7-day log retention'],
  },
  {
    planId: 'growth' as const,
    name: 'Growth',
    price: '$49',
    period: '/mo',
    description: 'For production merchants scaling volume',
    features: [
      '25,000 verifications/mo',
      'All providers',
      'Webhooks & audit logs',
      '30-day retention',
      'Email support',
    ],
    highlighted: true,
  },
  {
    planId: 'enterprise' as const,
    name: 'Enterprise',
    price: 'Custom',
    description: 'For high-volume and regulated workloads',
    features: [
      'Unlimited volume',
      'Dedicated support',
      'Custom SLAs',
      'On-prem options',
      'SOC 2 reports',
    ],
  },
] as const;
