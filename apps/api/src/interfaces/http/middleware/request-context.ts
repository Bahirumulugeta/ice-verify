import type { NextFunction, Request, Response } from 'express';
import { createRequestId } from '@ice/shared';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.header('x-request-id') || createRequestId()).toString();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      merchant?: {
        merchantId: string;
        apiKeyId: string | null;
        environment: 'test' | 'live';
        name: string;
        authType: 'api_key' | 'session';
        role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
        userId?: string;
      };
      sessionUser?: {
        id: string;
        email: string;
        name: string | null;
        role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
      };
    }
  }
}
