import safeRegex from 'safe-regex';
import { describe, test, expect } from 'vitest';
import { config } from '../extractIdsFromUrlComponents.config';
import { COMPILED_PATTERNS } from '@/lib/storeRegistry';

// Collect all patterns from searchPatterns, pathnamePatterns, and store configs
const regexPatterns = [
  ...config.PATTERNS.pathnamePatterns,
  config.PATTERNS.searchPattern,
  ...Array.from(COMPILED_PATTERNS.values()).flat(),
];

describe('Regex formatting rules', () => {
  test('should only use lowercase characters in regex patterns', () => {
    regexPatterns.forEach((pattern) => {
      const patternString = pattern.toString();
      const cleanPattern = patternString.slice(1, patternString.lastIndexOf('/'));

      const hasUppercase = /[A-Z]/.test(cleanPattern);

      if (hasUppercase) {
        console.log('Pattern with uppercase:', cleanPattern);
      }

      expect(hasUppercase).toBeFalsy();
    });
  });

  test('should not use case-insensitive flag in regex patterns', () => {
    regexPatterns.forEach((pattern) => {
      const patternString = pattern.toString();
      const flags = patternString.slice(patternString.lastIndexOf('/') + 1);

      const hasInsensitiveFlag = flags.includes('i');

      if (hasInsensitiveFlag) {
        console.log('Pattern with case-insensitive flag:', pattern.toString());
      }

      expect(hasInsensitiveFlag).toBeFalsy();
    });
  });

  test('should use global flag in all regex patterns', () => {
    regexPatterns.forEach((pattern) => {
      const patternString = pattern.toString();
      const flags = patternString.slice(patternString.lastIndexOf('/') + 1);

      const hasGlobalFlag = flags.includes('g');

      if (!hasGlobalFlag) {
        console.log('Pattern missing global flag:', pattern.toString());
      }

      expect(hasGlobalFlag).toBeTruthy();
    });
  });
});

describe('Regex pattern security & performance', () => {
  test('should only use safe regex patterns', () => {
    const unsafePatterns: string[] = [];

    regexPatterns.forEach((pattern) => {
      const isSafe = safeRegex(pattern);
      if (!isSafe) {
        unsafePatterns.push(pattern.toString());
      }
    });

    if (unsafePatterns.length > 0) {
      console.log('Found unsafe regex patterns:');
      unsafePatterns.forEach((pattern) => {
        console.log(`  - ${pattern}`);
      });
    }

    expect(unsafePatterns).toEqual([]);
  });

  test('should not have excessive backtracking', () => {
    regexPatterns.forEach((pattern) => {
      const patternString = pattern.toString();
      // Check for nested quantifiers which can cause catastrophic backtracking
      const hasNestedQuantifiers = /[+*?]{2,}|\{.+\}[+*?]|[+*?]\{.+\}/.test(patternString);

      if (hasNestedQuantifiers) {
        console.log('Pattern with potential backtracking issues:', patternString);
      }

      expect(hasNestedQuantifiers).toBeFalsy();
    });
  });

  test('should not have unnecessarily large character classes', () => {
    regexPatterns.forEach((pattern) => {
      const patternString = pattern.toString();
      // Look for character classes with more than 20 characters
      const largeClassMatch = patternString.match(/\[([^\]]{20,})\]/);

      if (largeClassMatch) {
        console.log('Pattern with large character class:', patternString);
        console.log('Large class:', largeClassMatch[1]);
      }

      expect(largeClassMatch).toBeNull();
    });
  });

  test('should complete regex matching within 10ms', () => {
    // Basic performance test to catch catastrophically slow patterns
    // For detailed performance analysis, see regex.bench.ts (run with: npm run test:bench)
    const TIMEOUT_MS = 10;
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

    regexPatterns.forEach((pattern) => {
      const startTime = performance.now();
      pattern.test(testString);
      const duration = performance.now() - startTime;

      if (duration > TIMEOUT_MS) {
        console.log(`Pattern took too long (${duration.toFixed(2)}ms):`, pattern.toString());
      }

      expect(duration).toBeLessThan(TIMEOUT_MS);
    });
  });
});
