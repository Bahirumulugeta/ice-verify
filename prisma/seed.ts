import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, createCipheriv } from 'node:crypto';

const prisma = new PrismaClient();

function hashApiKey(rawKey: string): string {
  const pepper = process.env.API_KEY_PEPPER ?? 'change-me-to-a-long-random-pepper-value-32chars';
  return createHash('sha256').update(`${pepper}:${rawKey}`).digest('hex');
}

function encryptSecret(secret: string): string {
  const pepper = process.env.API_KEY_PEPPER ?? 'change-me-to-a-long-random-pepper-value-32chars';
  const key = createHash('sha256').update(pepper).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

const PROVIDERS = [
  {
    name: 'demo',
    displayName: 'Demo Provider',
    integrationStatus: 'available' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: true,
      supportsReceiptVerification: false,
      supportsAsyncVerification: true,
      supportsWebhook: false,
      supportsBatchVerification: true,
      supportsTransactionSearch: true,
    },
  },
  {
    name: 'telebirr',
    displayName: 'Telebirr',
    integrationStatus: 'available' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: true,
      supportsReceiptVerification: true,
      supportsAsyncVerification: true,
      supportsWebhook: true,
      supportsBatchVerification: false,
      supportsTransactionSearch: true,
    },
  },
  {
    name: 'cbe',
    displayName: 'Commercial Bank of Ethiopia',
    integrationStatus: 'available' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: false,
      supportsReceiptVerification: true,
      supportsAsyncVerification: false,
      supportsWebhook: false,
      supportsBatchVerification: false,
      supportsTransactionSearch: true,
    },
  },
  {
    name: 'cbebirr',
    displayName: 'CBE Birr',
    integrationStatus: 'available' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: true,
      supportsReceiptVerification: false,
      supportsAsyncVerification: true,
      supportsWebhook: true,
      supportsBatchVerification: false,
      supportsTransactionSearch: true,
    },
  },
  {
    name: 'boa',
    displayName: 'Bank of Abyssinia',
    integrationStatus: 'available' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: false,
      supportsReceiptVerification: false,
      supportsAsyncVerification: false,
      supportsWebhook: false,
      supportsBatchVerification: false,
      supportsTransactionSearch: true,
    },
  },
  {
    name: 'dashen',
    displayName: 'Dashen Bank',
    integrationStatus: 'available' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: false,
      supportsReceiptVerification: false,
      supportsAsyncVerification: false,
      supportsWebhook: false,
      supportsBatchVerification: false,
      supportsTransactionSearch: true,
    },
  },
  {
    name: 'awash',
    displayName: 'Awash Bank',
    integrationStatus: 'pending' as const,
    capabilities: {
      supportsAmountValidation: true,
      supportsReceiverValidation: true,
      supportsSenderInformation: false,
      supportsReceiptVerification: false,
      supportsAsyncVerification: false,
      supportsWebhook: false,
      supportsBatchVerification: false,
      supportsTransactionSearch: true,
    },
  },
];

async function main() {
  const demoKey =
    process.env.DEMO_MERCHANT_API_KEY ?? 'ice_test_demo_key_do_not_use_in_production';

  for (const provider of PROVIDERS) {
    await prisma.provider.upsert({
      where: { name: provider.name },
      create: {
        name: provider.name,
        displayName: provider.displayName,
        integrationStatus: provider.integrationStatus,
        capabilitiesJson: provider.capabilities,
      },
      update: {
        displayName: provider.displayName,
        integrationStatus: provider.integrationStatus,
        capabilitiesJson: provider.capabilities,
      },
    });
  }

  const passwordHash = await bcrypt.hash('demo-password-change-me', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@iceverification.dev' },
    create: {
      email: 'demo@iceverification.dev',
      name: 'Demo Owner',
      passwordHash,
    },
    update: {
      name: 'Demo Owner',
      passwordHash,
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { slug: 'demo-merchant' },
    create: {
      name: 'Demo Merchant',
      slug: 'demo-merchant',
    },
    update: {
      name: 'Demo Merchant',
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_merchantId: {
        userId: user.id,
        merchantId: merchant.id,
      },
    },
    create: {
      userId: user.id,
      merchantId: merchant.id,
      role: 'OWNER',
    },
    update: {
      role: 'OWNER',
    },
  });

  const keyHash = hashApiKey(demoKey);
  const existingKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        merchantId: merchant.id,
        name: 'Demo Test Key',
        prefix: demoKey.slice(0, 16),
        keyHash,
        environment: 'test',
      },
    });
  }

  const demoProvider = await prisma.provider.findUniqueOrThrow({ where: { name: 'demo' } });
  await prisma.providerConfiguration.upsert({
    where: {
      merchantId_providerId: {
        merchantId: merchant.id,
        providerId: demoProvider.id,
      },
    },
    create: {
      merchantId: merchant.id,
      providerId: demoProvider.id,
      enabled: true,
      configJson: { environment: 'demo' },
    },
    update: { enabled: true },
  });

  const webhookSecret = 'whsec_demo_seed_secret_not_for_production';
  const existingWebhook = await prisma.webhook.findFirst({
    where: { merchantId: merchant.id, url: 'https://example.com/ice/webhooks' },
  });
  if (!existingWebhook) {
    await prisma.webhook.create({
      data: {
        merchantId: merchant.id,
        url: 'https://example.com/ice/webhooks',
        secretHash: encryptSecret(webhookSecret),
        secretPrefix: webhookSecret.slice(0, 12),
        events: [
          'verification.created',
          'verification.processing',
          'verification.completed',
          'verification.failed',
          'verification.risk_detected',
        ],
        description: 'Demo webhook endpoint (example.com)',
        enabled: false,
      },
    });
  }

  await prisma.planSubscription.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      planId: 'starter',
      status: 'active',
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      planId: 'starter',
      status: 'active',
    },
  });

  console.log('Seed complete');
  console.log('Demo user: demo@iceverification.dev / demo-password-change-me');
  console.log(`Demo API key: ${demoKey}`);
  console.log('Demo merchant slug: demo-merchant');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
