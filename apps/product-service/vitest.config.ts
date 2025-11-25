import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    maxConcurrency: 10,
    isolate: true,
  },
  esbuild: {
    target: 'esnext',
  },
});
