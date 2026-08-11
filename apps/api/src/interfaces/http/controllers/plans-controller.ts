import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '@ice/shared';
import type { AppContainer } from '../../../container.js';

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyUsd: 0,
    verificationQuota: 1000,
    features: ['Demo + live providers', 'Claim/consume API', 'Community support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthlyUsd: 49,
    verificationQuota: 25000,
    features: ['All providers', 'Webhooks', 'Image verify', 'Email support'],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyUsd: null,
    verificationQuota: null,
    features: ['Custom volume', 'SLA', 'Dedicated support', 'Private relays'],
  },
] as const;

const selectPlanSchema = z.object({
  planId: z.enum(['starter', 'growth', 'enterprise']),
});

function requireMerchant(req: Request) {
  if (!req.merchant) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  return req.merchant;
}

export function createPlansController(container: AppContainer) {
  return {
    list: async (req: Request, res: Response) => {
      res.json({
        success: true,
        data: PLANS,
        meta: { requestId: req.requestId },
      });
    },

    current: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const sub = await container.prisma.planSubscription.findUnique({
          where: { merchantId: merchant.merchantId },
        });
        const plan = PLANS.find((p) => p.id === (sub?.planId ?? 'starter')) ?? PLANS[0];
        res.json({
          success: true,
          data: { subscription: sub, plan },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    select: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = selectPlanSchema.parse(req.body);
        const sub = await container.prisma.planSubscription.upsert({
          where: { merchantId: merchant.merchantId },
          create: {
            merchantId: merchant.merchantId,
            planId: body.planId,
            status: 'active',
            renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            planId: body.planId,
            status: 'active',
            renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: 'api_key',
          action: 'plan.selected',
          resource: 'plan_subscription',
          resourceId: sub.id,
          requestId: req.requestId,
          metadata: { planId: body.planId },
        });
        res.json({
          success: true,
          data: sub,
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
