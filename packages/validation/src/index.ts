import { z } from 'zod';

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code');

export const providerNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9_-]+$/, 'Invalid provider name');

export const transactionReferenceSchema = z.string().trim().min(3).max(128);

export const createVerificationSchema = z.object({
  provider: providerNameSchema.optional(),
  reference: transactionReferenceSchema,
  accountSuffix: z.string().trim().min(5).max(8).optional(),
  phoneNumber: z.string().trim().min(9).max(15).optional(),
  expectedAmount: z.number().positive().optional(),
  currency: currencySchema.optional(),
  expectedReceiver: z.string().trim().min(3).max(128).optional(),
  metadata: z.record(z.unknown()).optional(),
  async: z.boolean().optional().default(false),
  /** When true, fail if this payment was already claimed/consumed */
  rejectIfClaimed: z.boolean().optional().default(true),
  /** After a successful verify, claim/consume the payment for this merchant */
  autoClaim: z.boolean().optional().default(false),
  externalOrderId: z.string().trim().max(128).optional(),
});

export const batchVerificationSchema = z.object({
  items: z.array(createVerificationSchema).min(1).max(100),
  async: z.boolean().optional().default(false),
});

export const parseVerificationSchema = z.object({
  text: z.string().trim().min(3).max(4000),
  provider: providerNameSchema.optional(),
});

export const claimPaymentSchema = z.object({
  provider: providerNameSchema,
  reference: transactionReferenceSchema,
  verificationId: z.string().optional(),
  externalOrderId: z.string().trim().max(128).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const releaseClaimSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  environment: z.enum(['test', 'live']).default('test'),
  expiresAt: z.string().datetime().optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z
    .array(
      z.enum([
        'verification.created',
        'verification.processing',
        'verification.completed',
        'verification.failed',
        'verification.risk_detected',
      ]),
    )
    .min(1),
  description: z.string().trim().max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type CreateVerificationInput = z.infer<typeof createVerificationSchema>;
export type BatchVerificationInput = z.infer<typeof batchVerificationSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
