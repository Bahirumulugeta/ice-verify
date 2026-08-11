import pino from 'pino';
import { getConfig } from '../../config/env.js';

export function createLogger(name = 'api') {
  const config = getConfig();
  return pino({
    name,
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'apiKey',
        'password',
        'token',
        'secret',
        'rawKey',
      ],
      remove: true,
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
