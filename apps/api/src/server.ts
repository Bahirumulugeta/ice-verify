import { createApp } from './app.js';
import { connectRedis, disconnectRedis } from './infrastructure/cache/redis.js';

async function main() {
  const { app, container } = createApp();
  const redisOk = await connectRedis();
  if (!redisOk) {
    container.logger.warn('Redis unavailable — cache/queue will use in-memory fallback if enabled');
  }

  const server = app.listen(container.config.API_PORT, container.config.API_HOST, () => {
    container.logger.info(
      {
        host: container.config.API_HOST,
        port: container.config.API_PORT,
        env: container.config.NODE_ENV,
        redis: redisOk,
      },
      'ICE API listening',
    );
  });

  const shutdown = async (signal: string) => {
    container.logger.info({ signal }, 'Shutting down API');
    server.close();
    await Promise.allSettled([container.prisma.$disconnect(), disconnectRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
