import type { Request, Response, NextFunction } from 'express';
import { createApiKeySchema, createWebhookSchema, loginSchema } from '@ice/validation';
import { AppError } from '@ice/shared';
import bcrypt from 'bcryptjs';
import type { AppContainer } from '../../../container.js';
import { generateApiKey } from '../../../infrastructure/crypto/api-keys.js';
import { generateWebhookSecret } from '../../../infrastructure/crypto/webhooks.js';
import { assertSafeWebhookUrl } from '../../../infrastructure/security/ssrf.js';
import {
  getSessionCookieName,
  sessionCookieOptions,
  signSession,
} from '../../../infrastructure/auth/session.js';

function requireMerchant(req: Request) {
  if (!req.merchant) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.merchant;
}

export function createProvidersController(container: AppContainer) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json({
          success: true,
          data: container.providers.list(),
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const provider = container.providers.get(String(req.params.provider));
        res.json({
          success: true,
          data: {
            name: provider.getName(),
            displayName: provider.getDisplayName(),
            capabilities: provider.getCapabilities(),
            integrationStatus: provider.getIntegrationStatus(),
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
    capabilities: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const provider = container.providers.get(String(req.params.provider));
        res.json({
          success: true,
          data: provider.getCapabilities(),
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createHealthController(container: AppContainer) {
  return {
    root: async (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          status: 'ok',
          service: container.config.APP_NAME,
          version: container.config.APP_VERSION,
        },
        meta: { requestId: req.requestId },
      });
    },
    live: async (_req: Request, res: Response) => {
      res.json({ success: true, data: { status: 'live' } });
    },
    ready: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await container.prisma.$queryRaw`SELECT 1`;
        try {
          await container.cache.get('health:ready');
        } catch {
          throw new AppError('INTERNAL_ERROR', 'Redis not ready', 503);
        }
        res.json({
          success: true,
          data: { status: 'ready' },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
    providers: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const results = [];
        for (const summary of container.providers.list()) {
          const provider = container.providers.get(summary.name);
          results.push(await provider.healthCheck());
        }
        res.json({
          success: true,
          data: results,
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createApiKeysController(container: AppContainer) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const keys = await container.prisma.apiKey.findMany({
          where: { merchantId: merchant.merchantId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            prefix: true,
            environment: true,
            expiresAt: true,
            revokedAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
        });
        res.json({ success: true, data: keys, meta: { requestId: req.requestId } });
      } catch (error) {
        next(error);
      }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = createApiKeySchema.parse(req.body);
        const generated = generateApiKey(body.environment);
        const created = await container.prisma.apiKey.create({
          data: {
            merchantId: merchant.merchantId,
            name: body.name,
            prefix: generated.prefix,
            keyHash: generated.hash,
            environment: generated.environment,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          },
        });
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: 'api_key',
          action: 'api_key.created',
          resource: 'api_key',
          resourceId: created.id,
          requestId: req.requestId,
        });
        res.status(201).json({
          success: true,
          data: {
            id: created.id,
            name: created.name,
            prefix: created.prefix,
            environment: created.environment,
            secret: generated.rawKey,
            expiresAt: created.expiresAt,
            createdAt: created.createdAt,
            warning: 'Store this secret now. It will not be shown again.',
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
    revoke: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const id = String(req.params.id);
        const updated = await container.prisma.apiKey.updateMany({
          where: { id, merchantId: merchant.merchantId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (!updated.count) {
          throw new AppError('NOT_FOUND', 'API key not found', 404);
        }
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: 'api_key',
          action: 'api_key.revoked',
          resource: 'api_key',
          resourceId: id,
          requestId: req.requestId,
        });
        res.json({ success: true, data: { id, revoked: true }, meta: { requestId: req.requestId } });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createWebhooksController(container: AppContainer) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const webhooks = await container.webhooks.list(merchant.merchantId);
        res.json({ success: true, data: webhooks, meta: { requestId: req.requestId } });
      } catch (error) {
        next(error);
      }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = createWebhookSchema.parse(req.body);
        await assertSafeWebhookUrl(body.url);
        const secret = generateWebhookSecret();
        const created = await container.webhooks.create({
          merchantId: merchant.merchantId,
          url: body.url,
          events: body.events,
          description: body.description,
          secretHash: secret.encrypted,
          secretPrefix: secret.prefix,
        });
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: 'api_key',
          action: 'webhook.created',
          resource: 'webhook',
          resourceId: created.id,
          requestId: req.requestId,
        });
        res.status(201).json({
          success: true,
          data: {
            id: created.id,
            url: body.url,
            events: body.events,
            secret: secret.rawSecret,
            secretPrefix: secret.prefix,
            warning: 'Store the signing secret now. It will not be shown again.',
          },
          meta: { requestId: req.requestId },
        });

      } catch (error) {
        next(error);
      }
    },
    delete: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const id = String(req.params.id);
        const deleted = await container.webhooks.delete(merchant.merchantId, id);
        if (!deleted) throw new AppError('NOT_FOUND', 'Webhook not found', 404);
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: 'api_key',
          action: 'webhook.deleted',
          resource: 'webhook',
          resourceId: id,
          requestId: req.requestId,
        });
        res.json({ success: true, data: { id, deleted: true }, meta: { requestId: req.requestId } });
      } catch (error) {
        next(error);
      }
    },
    test: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const id = String(req.params.id);
        const webhook = await container.prisma.webhook.findFirst({
          where: { id, merchantId: merchant.merchantId },
        });
        if (!webhook) throw new AppError('NOT_FOUND', 'Webhook not found', 404);
        const deliveryId = `dlv_test_${Date.now()}`;
        await container.webhooks.createDelivery({
          id: deliveryId,
          webhookId: webhook.id,
          event: 'verification.completed',
          payload: {
            verificationId: 'ver_test',
            status: 'VERIFIED',
            verified: true,
            test: true,
          },
        });
        await container.queue.enqueue(
          'webhook.deliver',
          { deliveryId, webhookId: webhook.id },
          deliveryId,
        );
        res.json({
          success: true,
          data: { deliveryId, queued: true },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
    retry: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const webhookId = String(req.params.id);
        const deliveryId = String(req.body.deliveryId ?? '');
        if (!deliveryId) {
          throw new AppError('INVALID_REQUEST', 'deliveryId is required', 400);
        }
        const delivery = await container.prisma.webhookDelivery.findFirst({
          where: { id: deliveryId, webhookId, webhook: { merchantId: merchant.merchantId } },
        });
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found', 404);
        await container.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: { status: 'RETRYING', nextRetryAt: new Date() },
        });
        await container.queue.enqueue(
          'webhook.deliver',
          { deliveryId, webhookId },
          `${deliveryId}:retry`,
        );
        res.json({
          success: true,
          data: { deliveryId, queued: true },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createUsageController(container: AppContainer) {
  return {
    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const days = Math.min(Number(req.query.days ?? 7), 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const summary = await container.usage.summarize(merchant.merchantId, since);
        const verifications = await container.prisma.verificationRequest.groupBy({
          by: ['status'],
          where: { merchantId: merchant.merchantId, createdAt: { gte: since } },
          _count: { _all: true },
        });
        res.json({
          success: true,
          data: {
            days,
            metrics: summary,
            verificationStatus: Object.fromEntries(
              verifications.map((row) => [row.status, row._count._all]),
            ),
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createAuthController(container: AppContainer) {
  return {
    login: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = loginSchema.parse(req.body);
        const user = await container.prisma.user.findUnique({
          where: { email: body.email.toLowerCase() },
          include: { memberships: { include: { merchant: true } } },
        });
        if (!user) {
          throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
        }
        const valid = await bcrypt.compare(body.password, user.passwordHash);
        if (!valid) {
          throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
        }
        const membership = user.memberships[0];
        if (!membership) {
          throw new AppError('FORBIDDEN', 'User has no merchant membership', 403);
        }

        const token = signSession(
          {
            userId: user.id,
            merchantId: membership.merchantId,
            role: membership.role,
            email: user.email,
          },
          container.config.JWT_SECRET,
        );

        res.cookie(
          getSessionCookieName(),
          token,
          sessionCookieOptions(container.config.isProduction),
        );

        await container.audits.write({
          merchantId: membership.merchantId,
          actorType: 'user',
          action: 'auth.login',
          resource: 'user',
          resourceId: user.id,
          requestId: req.requestId,
        });

        res.json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
            merchant: {
              id: membership.merchant.id,
              name: membership.merchant.name,
              slug: membership.merchant.slug,
              role: membership.role,
            },
            session: {
              type: 'dashboard',
              cookie: getSessionCookieName(),
              note: 'Session cookie set. API keys remain the preferred auth for server-to-server verification.',
            },
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    me: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        if (!req.sessionUser && merchant.authType !== 'session') {
          res.json({
            success: true,
            data: {
              authType: 'api_key',
              merchant: {
                id: merchant.merchantId,
                name: merchant.name,
                environment: merchant.environment,
              },
            },
            meta: { requestId: req.requestId },
          });
          return;
        }
        res.json({
          success: true,
          data: {
            authType: merchant.authType,
            user: req.sessionUser,
            merchant: {
              id: merchant.merchantId,
              name: merchant.name,
              role: merchant.role,
              environment: merchant.environment,
            },
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    logout: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.clearCookie(getSessionCookieName(), sessionCookieOptions(container.config.isProduction));
        res.json({
          success: true,
          data: { loggedOut: true },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createAuditController(container: AppContainer) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const logs = await container.prisma.auditLog.findMany({
          where: { merchantId: merchant.merchantId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        res.json({ success: true, data: logs, meta: { requestId: req.requestId } });
      } catch (error) {
        next(error);
      }
    },
  };
}
