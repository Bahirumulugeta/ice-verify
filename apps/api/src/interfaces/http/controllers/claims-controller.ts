import type { Request, Response, NextFunction } from 'express';
import { claimPaymentSchema, releaseClaimSchema } from '@ice/validation';
import { AppError } from '@ice/shared';
import type { AppContainer } from '../../../container.js';

function requireMerchant(req: Request) {
  if (!req.merchant) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.merchant;
}

export function createClaimsController(container: AppContainer) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const claims = await container.claims.list(merchant.merchantId, 100);
        res.json({
          success: true,
          data: claims,
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    claim: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = claimPaymentSchema.parse(req.body);

        const successful = await container.prisma.verificationRequest.findFirst({
          where: {
            merchantId: merchant.merchantId,
            provider: body.provider.toLowerCase(),
            reference: body.reference,
            verified: true,
            ...(body.verificationId ? { id: body.verificationId } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!successful) {
          throw new AppError(
            'INVALID_REQUEST',
            'Claim requires a successful verification for this payment by your merchant first',
            400,
            { provider: body.provider, reference: body.reference },
          );
        }

        const claim = await container.claims.claim({
          merchantId: merchant.merchantId,
          provider: body.provider,
          reference: body.reference,
          verificationId: body.verificationId ?? successful.id,
          externalOrderId: body.externalOrderId,
          metadata: body.metadata,
        });
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: merchant.authType === 'session' ? 'user' : 'api_key',
          action: 'payment.claimed',
          resource: 'payment_claim',
          resourceId: claim.id,
          requestId: req.requestId,
          metadata: { provider: body.provider, reference: body.reference },
        });
        res.status(201).json({
          success: true,
          data: claim,
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    status: async (req: Request, res: Response, next: NextFunction) => {
      try {
        requireMerchant(req);
        const provider = String(req.params.provider);
        const reference = String(req.params.reference);
        const claim = await container.claims.findActive(provider, reference);
        res.json({
          success: true,
          data: {
            provider,
            reference,
            claimed: Boolean(claim),
            claim,
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    release: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = releaseClaimSchema.parse(req.body ?? {});
        const claimId = String(req.params.id);
        const released = await container.claims.release(merchant.merchantId, claimId, body.reason);
        if (!released) {
          throw new AppError('NOT_FOUND', 'Claim not found', 404);
        }
        await container.audits.write({
          merchantId: merchant.merchantId,
          actorType: merchant.authType === 'session' ? 'user' : 'api_key',
          action: 'payment.claim_released',
          resource: 'payment_claim',
          resourceId: claimId,
          requestId: req.requestId,
        });
        res.json({
          success: true,
          data: released,
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
