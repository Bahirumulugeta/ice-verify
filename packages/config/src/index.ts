import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().default('ice-verification'),
  APP_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  WEB_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  API_KEY_PEPPER: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  WEBHOOK_SIGNING_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),

  VERIFICATION_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  BATCH_SYNC_MAX_SIZE: z.coerce.number().int().positive().default(20),
  BATCH_ASYNC_MAX_SIZE: z.coerce.number().int().positive().default(100),
  DUPLICATE_WINDOW_HOURS: z.coerce.number().int().positive().default(24),

  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  WEBHOOK_MAX_RETRIES: z.coerce.number().int().nonnegative().default(8),
  PROVIDER_HEALTH_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),

  DEMO_MERCHANT_API_KEY: z.string().optional(),

  // Telebirr (public receipt + optional Ethiopia-hosted relays)
  TELEBIRR_PRIMARY_RECEIPT_URL: z
    .string()
    .url()
    .default('https://transactioninfo.ethiotelecom.et/receipt/'),
  TELEBIRR_FALLBACK_PROXIES: z.string().optional().default(''),
  TELEBIRR_PROXY_LABELS: z.string().optional().default(''),
  TELEBIRR_PROXY_KEY: z.string().optional().default(''),
  TELEBIRR_SKIP_PRIMARY: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  TELEBIRR_TIMEOUT_MS: z.coerce.number().int().positive().default(18_000),
  TELEBIRR_TOTAL_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
});

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  isProduction: boolean;
  telebirrFallbackProxies: string[];
  telebirrProxyLabels: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }

  const data = parsed.data;
  return {
    ...data,
    corsOrigins: data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    isProduction: data.NODE_ENV === 'production',
    telebirrFallbackProxies: (data.TELEBIRR_FALLBACK_PROXIES || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    telebirrProxyLabels: (data.TELEBIRR_PROXY_LABELS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };
}
