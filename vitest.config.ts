import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    dir: 'src',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.serverless/**'],
    globals: true,
    setupFiles: ['./src/__tests__/customMatchers.ts'],

    // Performance optimizations for concurrent testing
    maxConcurrency: 10,
    isolate: true,

    // Benchmark configuration
    benchmark: {
      include: ['**/__tests__/**/*.bench.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // Include only source files
      include: ['src/**/*.ts'],

      // More specific exclusions
      exclude: [
        '**/node_modules/**',
        '**/__tests__/**',
        '**/example.ts',
        '**/index.ts', // Re-export files with 0% coverage
        '**/*.d.ts',
        '**/handlers/**', // Handler integration tests not yet implemented
        '**/middleware/**', // Middleware integration tests not yet implemented
      ],

      // Set coverage thresholds to prevent regression
      // These match current coverage levels for core functionality
      thresholds: {
        statements: 74,
        branches: 60,
        functions: 80,
        lines: 73,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  esbuild: {
    target: 'esnext',
  },
});
