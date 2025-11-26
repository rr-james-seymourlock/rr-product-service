import { resolve } from 'path';
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
  resolve: {
    alias: {
      '@rr/url-parser': resolve(import.meta.dirname, '../../packages/url-parser/src'),
      '@rr/product-id-extractor': resolve(
        import.meta.dirname,
        '../../packages/product-id-extractor/src',
      ),
      '@rr/store-registry': resolve(import.meta.dirname, '../../packages/store-registry/src'),
      '@rr/schema-parser': resolve(import.meta.dirname, '../../packages/schema-parser/src'),
      '@rr/shared': resolve(import.meta.dirname, '../../packages/shared/src'),
    },
  },
  esbuild: {
    target: 'esnext',
  },
});
