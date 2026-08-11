import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { Request } from 'express';
import { createContainer } from './container.js';
import { createApiRouter } from './interfaces/http/routes/index.js';
import { requestContext } from './interfaces/http/middleware/request-context.js';
import { errorHandler, notFoundHandler } from './interfaces/http/middleware/error-handler.js';
import { openApiDocument } from './interfaces/http/openapi.js';

export function createApp() {
  const container = createContainer();
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: container.config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger: container.logger,
      customProps: (req: Request) => ({ requestId: req.requestId }),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'ICE Verification API',
        version: container.config.APP_VERSION,
        docs: '/api/docs',
        health: '/api/v1/health',
      },
    });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use('/api/v1', createApiRouter(container));
  app.use(notFoundHandler);
  app.use(errorHandler(container.logger));

  return { app, container };
}
