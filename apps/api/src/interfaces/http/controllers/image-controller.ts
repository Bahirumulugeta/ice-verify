import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@ice/shared';
import { detectProvider } from '@ice/providers';
import type { AppContainer } from '../../../container.js';

function requireMerchant(req: Request) {
  if (!req.merchant) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  return req.merchant;
}

/**
 * Image verification:
 * - Prefer structured fields extracted by client OCR / form (provider, reference, suffix, phone)
 * - Optional auto-verify against provider adapters
 * Full vision OCR can be enabled later with MISTRAL_API_KEY.
 */
export function createImageController(container: AppContainer) {
  return {
    verify: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchant = requireMerchant(req);
        const file = req.file;
        if (!file) {
          throw new AppError('INVALID_REQUEST', 'No image file uploaded (field name: file)', 400);
        }

        const reference = String(req.body.reference ?? '').trim();
        const accountSuffix = req.body.accountSuffix
          ? String(req.body.accountSuffix).trim()
          : undefined;
        const phoneNumber = req.body.phoneNumber
          ? String(req.body.phoneNumber).trim()
          : undefined;
        let provider = req.body.provider
          ? String(req.body.provider).trim().toLowerCase()
          : undefined;

        if (!reference) {
          throw new AppError(
            'INVALID_REQUEST',
            'Provide reference extracted from the receipt image (OCR client-side or manual).',
            400,
          );
        }

        if (!provider) {
          provider =
            detectProvider({ reference, accountSuffix, phoneNumber }) ?? undefined;
        }
        if (!provider) {
          throw new AppError(
            'INVALID_REQUEST',
            'Could not detect provider from image metadata. Pass provider explicitly.',
            400,
          );
        }

        const autoVerify = String(req.query.autoVerify ?? 'true') !== 'false';
        if (!autoVerify) {
          res.json({
            success: true,
            data: {
              extracted: { provider, reference, accountSuffix, phoneNumber },
              file: { name: file.originalname, size: file.size, mime: file.mimetype },
            },
            meta: { requestId: req.requestId },
          });
          return;
        }

        const view = await container.createVerification.execute({
          merchantId: merchant.merchantId,
          provider,
          reference,
          accountSuffix,
          phoneNumber,
          environment: merchant.environment,
          requestId: req.requestId,
          metadata: {
            source: 'image_upload',
            fileName: file.originalname,
            mimeType: file.mimetype,
          },
        });

        res.json({
          success: true,
          data: {
            extracted: { provider, reference, accountSuffix, phoneNumber },
            verification: view,
          },
          meta: { requestId: req.requestId },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
