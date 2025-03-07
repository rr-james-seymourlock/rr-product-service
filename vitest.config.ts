import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.serverless/**'],
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/__tests__/**']
    }
  },
});