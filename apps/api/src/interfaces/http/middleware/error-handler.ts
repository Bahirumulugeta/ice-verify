import type { NextFunction, Request, Response } from 'express';
import { AppError, isAppError } from '@ice/shared';
import { ZodError } from 'zod';
import type { Logger } from '../../../infrastructure/logging/logger.js';

export function errorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request validation failed',
          requestId: req.requestId,
          details: error.flatten(),
        },
      });
      return;
    }

    if (isAppError(error)) {
      if (error.statusCode >= 500) {
        logger.error({ err: error, requestId: req.requestId }, error.message);
      }
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          requestId: req.requestId,
          details: error.details,
        },
      });
      return;
    }

    logger.error({ err: error, requestId: req.requestId }, 'Unhandled error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId: req.requestId,
      },
    });
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', `Route not found: ${req.method} ${req.path}`, 404));
}
