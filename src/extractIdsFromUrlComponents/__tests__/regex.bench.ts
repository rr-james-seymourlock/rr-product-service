import { bench, describe } from 'vitest';
import { config } from '../config';
import { COMPILED_PATTERNS } from '@/storeConfigs';

/**
 * Benchmark suite for regex pattern performance
 *
 * Uses Vitest v4 Benchmark API for accurate performance measurements
 * with statistical analysis (mean, median, p95, p99).
 *
 * Run with: npm run test:bench
 */

// Collect all patterns from searchPatterns, pathnamePatterns, and store configs
const regexPatterns = [
  ...config.PATTERNS.pathnamePatterns,
  config.PATTERNS.searchPattern,
  ...[...COMPILED_PATTERNS.values()].flat(),
];

// Complex test string with various URL patterns
const testString = [
  'https://www.subdomain.domain.com',
  '/t/product/',
  '/power-grip-primer-pimprod2030073',
  '/dri-fit-womens-t-shirt-dM375qq5',
  '/dp/236380',
  '/kringle-express-set-of-2-plush-60x70-holiday-plaid-throws',
  '/us/gg-lace-bodysuit/JI5627',
  '/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaZ',
  'a'.repeat(30),
  '/product/water-drench-hyaluronic-cloud-hydra-gel-eye-patches-P423254',
  '/prod6272927/prd5252028/p62818712/prod-62926242/prd-62418260/p-12433181',
  '.product.html',
  '?pid=8852670020003',
  '&sc=CRT&cm_sp=VIEWPOSITION-_-1-_-H474467&TZ=EST',
  '&sku=2591795&productId=pimprod2030073&skuId=2591795',
  '&?pfm=bdrecs-WebStore-ShoppingBag-Horizontal-b606-229&bdrecsId=8c64cda8-7622-4cb4-9007-f1cf4c3aa9ef',
  '&dwvar_0400020980777_color=BLUSH',
].join('');

describe('Regex Pattern Performance Benchmarks', () => {
  bench(
    'all pathname patterns',
    () => {
      for (const pattern of config.PATTERNS.pathnamePatterns) {
        pattern.test(testString);
      }
    },
    {
      time: 1000, // Run for 1 second
      iterations: 100, // Minimum iterations
    },
  );

  bench(
    'search pattern',
    () => {
      config.PATTERNS.searchPattern.test(testString);
    },
    {
      time: 1000,
      iterations: 100,
    },
  );

  bench(
    'all store-specific patterns',
    () => {
      for (const pattern of [...COMPILED_PATTERNS.values()].flat()) {
        pattern.test(testString);
      }
    },
    {
      time: 1000,
      iterations: 100,
    },
  );

  bench(
    'all patterns combined',
    () => {
      for (const pattern of regexPatterns) {
        pattern.test(testString);
      }
    },
    {
      time: 1000,
      iterations: 100,
    },
  );

  // Benchmark individual critical patterns
  if (config.PATTERNS.pathnamePatterns.length > 0) {
    const firstPattern = config.PATTERNS.pathnamePatterns[0];
    if (firstPattern) {
      bench(
        'first pathname pattern (critical path)',
        () => {
          firstPattern.test(testString);
        },
        {
          time: 500,
          iterations: 1000,
        },
      );
    }
  }

  // Benchmark with realistic URL string (shorter)
  const realisticUrl = 'https://www.target.com/p/product-name/-/A-12345678?ref=123';

  bench(
    'all patterns against realistic URL',
    () => {
      for (const pattern of regexPatterns) {
        pattern.test(realisticUrl);
      }
    },
    {
      time: 1000,
      iterations: 500,
    },
  );
});
