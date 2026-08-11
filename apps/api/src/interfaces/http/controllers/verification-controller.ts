import type { Request, Response, NextFunction } from 'express';
import {
  batchVerificationSchema,
  createVerificationSchema,
  parseVerificationSchema,
} from '@ice/validation';
import { AppError, addSeconds } from '@ice/shared';
import type { AppContainer } from '../../../container.js';
import { hashPayload } from '../../../infrastructure/database/repositories/supporting-repositories.js';
import { serializeVerificationView } from '../../../infrastructure/database/repositories/verification-repository.js';

function requireMerchant(req: Request) {
  if (!req.merchant) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.merchant;
}

export function createVerificationController(container: AppContainer) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = createVerificationSchema.parse(req.body);
        const idempotencyKey = req.header('idempotency-key')?.trim();

        if (idempotencyKey) {
          const requestHash = hashPayload(body);
          const existing = await container.idempotency.find(merchant.merchantId, idempotencyKey);
          if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new AppError(
                'IDEMPOTENCY_CONFLICT',
                'Idempotency key reused with a different payload',
                409,
              );
            }
            res.status(existing.statusCode).json(existing.responseJson);
            return;
          }
        }

        const view = await container.createVerification.execute({
          merchantId: merchant.merchantId,
          provider: body.provider,
          reference: body.reference,
          accountSuffix: body.accountSuffix,
          phoneNumber: body.phoneNumber,
          expectedAmount: body.expectedAmount,
          currency: body.currency,
          expectedReceiver: body.expectedReceiver,
          metadata: body.metadata,
          async: body.async,
          rejectIfClaimed: body.rejectIfClaimed,
          autoClaim: body.autoClaim,
          externalOrderId: body.externalOrderId,
          idempotencyKey,
          environment: merchant.environment,
          requestId: req.requestId,
        });

        const responseBody = {
          success: true,
          data: serializeVerificationView(view),
          meta: { requestId: req.requestId },
        };

        if (idempotencyKey) {
          await container.idempotency.save({
            merchantId: merchant.merchantId,
            key: idempotencyKey,
            requestHash: hashPayload(body),
            responseJson: responseBody,
            statusCode: 200,
            expiresAt: addSeconds(new Date(), 24 * 60 * 60),
          });
        }

        res.status(200).json(responseBody);
      } catch (error) {
        next(error);
      }
    },

    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const id = String(req.params.id);
        const record = await container.verifications.findById(id, merchant.merchantId);
        if (!record) {
          throw new AppError('NOT_FOUND', 'Verification not found', 404);
        }
        res.json({
          success: true,
          data: serializeVerificationView(container.verifications.toView(record)),
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const limit = Math.min(Number(req.query.limit ?? 20), 100);
        const offset = Math.max(Number(req.query.offset ?? 0), 0);
        const result = await container.verifications.list({
          merchantId: merchant.merchantId,
          status: req.query.status as never,
          provider: req.query.provider as string | undefined,
          search: req.query.search as string | undefined,
          limit,
          offset,
        });
        res.json({
          success: true,
          data: {
            items: result.items.map((item) =>
              serializeVerificationView(container.verifications.toView(item)),
            ),
            total: result.total,
            limit,
            offset,
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    batch: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const body = batchVerificationSchema.parse(req.body);
        const max = body.async
          ? container.config.BATCH_ASYNC_MAX_SIZE
          : container.config.BATCH_SYNC_MAX_SIZE;
        if (body.items.length > max) {
          throw new AppError(
            'INVALID_REQUEST',
            `Batch size exceeds limit of ${max}`,
            400,
            { max },
          );
        }

        const results = [];
        for (const item of body.items) {
          const view = await container.createVerification.execute({
            merchantId: merchant.merchantId,
            provider: item.provider,
            reference: item.reference,
            accountSuffix: item.accountSuffix,
            phoneNumber: item.phoneNumber,
            expectedAmount: item.expectedAmount,
            currency: item.currency,
            expectedReceiver: item.expectedReceiver,
            metadata: item.metadata,
            async: body.async || item.async,
            rejectIfClaimed: item.rejectIfClaimed,
            autoClaim: item.autoClaim,
            externalOrderId: item.externalOrderId,
            environment: merchant.environment,
            requestId: req.requestId,
          });
          results.push(serializeVerificationView(view));
        }

        res.json({
          success: true,
          data: { items: results },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },

    parse: async (req: Request, res: Response, next: NextFunction) => {
      try {
        requireMerchant(req);
        const body = parseVerificationSchema.parse(req.body);
        const text = body.text;
        const referenceMatch = text.match(/\b(DEMO-[A-Z0-9-]+|[A-Z0-9-]{6,})\b/i);
        const amountMatch = text.match(/(?:ETB|USD)?\s*([0-9]+(?:\.[0-9]+)?)/i);
        const phoneMatch = text.match(/0?9\d{8}/);

        res.json({
          success: true,
          data: {
            provider: body.provider ?? (referenceMatch?.[1]?.toUpperCase().startsWith('DEMO-') ? 'demo' : undefined),
            reference: referenceMatch?.[1],
            expectedAmount: amountMatch ? Number(amountMatch[1]) : undefined,
            currency: /ETB/i.test(text) ? 'ETB' : undefined,
            expectedReceiver: phoneMatch?.[0],
            confidence: referenceMatch ? 0.7 : 0.2,
            note: 'Heuristic parse only. Not a substitute for structured provider data.',
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
