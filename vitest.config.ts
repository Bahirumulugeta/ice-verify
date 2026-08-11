import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'apps/api/src/**/*.test.ts',
      'apps/worker/src/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@ice/domain': path.resolve(__dirname, 'packages/domain/src'),
      '@ice/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@ice/validation': path.resolve(__dirname, 'packages/validation/src'),
      '@ice/config': path.resolve(__dirname, 'packages/config/src'),
      '@ice/providers': path.resolve(__dirname, 'packages/providers/src'),
      '@ice/api-client': path.resolve(__dirname, 'packages/api-client/src'),
    },
  },
});
