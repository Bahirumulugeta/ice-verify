import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@ice/shared';
import type { PrismaClient } from '@prisma/client';
import { hashApiKey, parseApiKeyEnvironment } from '../../../infrastructure/crypto/api-keys.js';
import type { CachePort } from '../../../application/ports.js';
import type { AppConfig } from '@ice/config';
import {
  getSessionCookieName,
  verifySession,
  type SessionPayload,
} from '../../../infrastructure/auth/session.js';

type DashboardRole = SessionPayload['role'];

const ROLE_RANK: Record<DashboardRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function requireRoles(...roles: DashboardRole[]) {
  const minRank = Math.min(...roles.map((role) => ROLE_RANK[role]));
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.merchant) {
        throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
      }
      if (req.merchant.authType === 'api_key') {
        // API keys act with merchant-level authority for integration use.
        next();
        return;
      }
      const role = req.merchant.role ?? 'VIEWER';
      if (ROLE_RANK[role] < minRank) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions for this action', 403, {
          required: roles,
          role,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function apiKeyAuth(prisma: PrismaClient, cache: CachePort, config: AppConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.header('authorization');
      if (header?.startsWith('Bearer ')) {
        await authenticateApiKey(req, res, prisma, cache, config, header.slice('Bearer '.length).trim());
        next();
        return;
      }

      const cookieToken = req.cookies?.[getSessionCookieName()];
      if (typeof cookieToken === 'string' && cookieToken.length > 0) {
        await authenticateSession(req, prisma, config, cookieToken);
        next();
        return;
      }

      throw new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401);
    } catch (error) {
      next(error);
    }
  };
}

async function authenticateApiKey(
  req: Request,
  res: Response,
  prisma: PrismaClient,
  cache: CachePort,
  config: AppConfig,
  rawKey: string,
): Promise<void> {
  const environment = parseApiKeyEnvironment(rawKey);
  if (!environment) {
    throw new AppError('UNAUTHORIZED', 'Invalid API key format', 401);
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { merchant: true },
  });

  if (!apiKey || apiKey.revokedAt) {
    throw new AppError('UNAUTHORIZED', 'Invalid API key', 401);
  }
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
    throw new AppError('UNAUTHORIZED', 'API key expired', 401);
  }
  if (apiKey.environment !== environment) {
    throw new AppError('UNAUTHORIZED', 'API key environment mismatch', 401);
  }

  const windowSeconds = Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000);
  const rateKey = `rl:${apiKey.id}:${Math.floor(Date.now() / config.RATE_LIMIT_WINDOW_MS)}`;
  const count = await cache.incrWithExpire(rateKey, windowSeconds);
  const remaining = Math.max(0, config.RATE_LIMIT_MAX_REQUESTS - count);
  const reset = Math.ceil(Date.now() / 1000) + windowSeconds;

  res.setHeader('X-RateLimit-Limit', String(config.RATE_LIMIT_MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(reset));

  if (count > config.RATE_LIMIT_MAX_REQUESTS) {
    throw new AppError('RATE_LIMITED', 'Rate limit exceeded', 429, {
      limit: config.RATE_LIMIT_MAX_REQUESTS,
      reset,
    });
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  req.merchant = {
    merchantId: apiKey.merchantId,
    apiKeyId: apiKey.id,
    environment: apiKey.environment,
    name: apiKey.merchant.name,
    authType: 'api_key',
    role: 'OWNER',
  };

  await cache.incrWithExpire(`usage:api_requests:${apiKey.merchantId}`, 86_400).catch(() => 0);
}

async function authenticateSession(
  req: Request,
  prisma: PrismaClient,
  config: AppConfig,
  token: string,
): Promise<void> {
  const session = verifySession(token, config.JWT_SECRET);
  if (!session) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired session', 401);
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_merchantId: {
        userId: session.userId,
        merchantId: session.merchantId,
      },
    },
    include: { merchant: true, user: true },
  });

  if (!membership) {
    throw new AppError('UNAUTHORIZED', 'Session is no longer valid', 401);
  }

  req.merchant = {
    merchantId: membership.merchantId,
    apiKeyId: null,
    environment: 'test',
    name: membership.merchant.name,
    authType: 'session',
    role: membership.role,
    userId: membership.userId,
  };
  req.sessionUser = {
    id: membership.userId,
    email: membership.user.email,
    name: membership.user.name,
    role: membership.role,
  };
}
