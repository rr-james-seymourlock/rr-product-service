/* eslint-env node */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outdir = join(__dirname, 'dist');

// Ensure output directory exists
mkdirSync(outdir, { recursive: true });

console.log('Building Lambda functions with esbuild...');

try {
  await build({
    entryPoints: {
      health: 'src/functions/health/handler.ts',
      'create-url-analysis': 'src/functions/create-url-analysis/handler.ts',
      'convert-asin': 'src/functions/convert-asin/handler.ts',
      'normalize-cart-views': 'src/functions/normalize-cart-views/handler.ts',
    },
    bundle: true,
    platform: 'node',
    target: 'es2023',
    format: 'esm',
    outdir,
    outExtension: { '.js': '.mjs' },
    external: ['@aws-sdk/*'],
    sourcemap: true,
    minify: false,
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    logLevel: 'info',
  });

  console.log('✓ Build successful');
  console.log(`✓ Output: ${outdir}`);
} catch (error) {
  console.error('✗ Build failed:', error);
  process.exit(1);
}
