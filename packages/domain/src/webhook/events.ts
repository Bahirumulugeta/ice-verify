export const WEBHOOK_EVENTS = [
  'verification.created',
  'verification.processing',
  'verification.completed',
  'verification.failed',
  'verification.risk_detected',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
