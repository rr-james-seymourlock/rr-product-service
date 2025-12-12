import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StoreOnboardingManager } from '../store-onboarding.js';

describe('StoreOnboardingManager', () => {
  // --------------------------------------------------------------------------
  // URL Validation Tests
  // --------------------------------------------------------------------------

  describe('validateStoreId', () => {
    it('should accept valid numeric store IDs', () => {
      expect(StoreOnboardingManager.validateStoreId('12345').valid).toBe(true);
      expect(StoreOnboardingManager.validateStoreId('1').valid).toBe(true);
      expect(StoreOnboardingManager.validateStoreId('999999999').valid).toBe(true);
    });

    it('should reject non-numeric store IDs', () => {
      expect(StoreOnboardingManager.validateStoreId('abc').valid).toBe(false);
      expect(StoreOnboardingManager.validateStoreId('123abc').valid).toBe(false);
      expect(StoreOnboardingManager.validateStoreId('').valid).toBe(false);
      expect(StoreOnboardingManager.validateStoreId(' ').valid).toBe(false);
    });
  });

  describe('validateDomain', () => {
    it('should accept valid domains', () => {
      expect(StoreOnboardingManager.validateDomain('example.com').valid).toBe(true);
      expect(StoreOnboardingManager.validateDomain('www.example.com').valid).toBe(true);
      expect(StoreOnboardingManager.validateDomain('shop.example.co.uk').valid).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(StoreOnboardingManager.validateDomain('').valid).toBe(false);
      expect(StoreOnboardingManager.validateDomain('not a domain').valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // URL Filtering Tests
  // --------------------------------------------------------------------------

  describe('filterUrls', () => {
    it('should keep product URLs and filter non-product URLs', () => {
      const urls = [
        'https://example.com/product/12345',
        'https://example.com/cart',
        'https://example.com/checkout',
        'https://example.com/account/settings',
        'https://example.com/item/67890',
      ];

      const { productUrls, filteredUrls } = StoreOnboardingManager.filterUrls(urls);

      expect(productUrls).toHaveLength(2);
      expect(filteredUrls).toHaveLength(3);
      expect(filteredUrls.map((f) => f.reason)).toContain('cart');
      expect(filteredUrls.map((f) => f.reason)).toContain('checkout');
      expect(filteredUrls.map((f) => f.reason)).toContain('account');
    });

    it('should filter by domain when provided', () => {
      const urls = ['https://example.com/product/12345', 'https://other.com/product/67890'];

      const { productUrls, filteredUrls } = StoreOnboardingManager.filterUrls(urls, 'example.com');

      expect(productUrls).toHaveLength(1);
      expect(productUrls[0]).toContain('example.com');
      expect(filteredUrls).toHaveLength(1);
    });

    it('should warn when fewer than 5 product URLs remain', () => {
      const urls = ['https://example.com/product/1', 'https://example.com/product/2'];

      const { warnings } = StoreOnboardingManager.filterUrls(urls);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Only 2 product URLs');
    });
  });

  describe('deduplicateUrls', () => {
    it('should remove duplicate URLs', () => {
      const urls = [
        'https://example.com/product/12345',
        'https://example.com/product/12345',
        'https://EXAMPLE.COM/product/12345',
        'https://example.com/product/67890',
      ];

      const unique = StoreOnboardingManager.deduplicateUrls(urls);

      expect(unique).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // URL Analysis Tests
  // --------------------------------------------------------------------------

  describe('analyzeUrl', () => {
    it('should extract numeric ID from pathname', () => {
      const result = StoreOnboardingManager.analyzeUrl('https://example.com/product/12345678');

      expect(result.extractedIds).toContain('12345678');
      expect(result.idLocation).toBe('pathname');
      expect(result.idFormat).toBe('numeric');
    });

    it('should extract ID from search param', () => {
      const result = StoreOnboardingManager.analyzeUrl('https://example.com/product?skuid=12345');

      expect(result.extractedIds).toContain('12345');
      expect(result.idLocation).toBe('search_param');
      expect(result.searchParamName).toBe('skuid');
    });

    it('should extract prefixed IDs', () => {
      const result = StoreOnboardingManager.analyzeUrl('https://example.com/product/A-12345678');

      expect(result.extractedIds).toContain('12345678');
      expect(result.idFormat).toBe('prefixed');
    });

    it('should handle URLs with no identifiable pattern', () => {
      const result = StoreOnboardingManager.analyzeUrl('https://example.com/about-us');

      expect(result.extractedIds).toHaveLength(0);
      expect(result.idLocation).toBeNull();
    });
  });

  describe('analyzeUrls', () => {
    it('should identify common patterns across URLs', () => {
      const urls = [
        'https://example.com/p/12345678',
        'https://example.com/p/23456789',
        'https://example.com/p/34567890',
        'https://example.com/p/45678901',
        'https://example.com/p/56789012',
      ];

      const { patterns, results } = StoreOnboardingManager.analyzeUrls(urls);

      expect(results).toHaveLength(5);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]!.confidence).toBe('high');
    });

    it('should warn about URLs with no pattern', () => {
      const urls = ['https://example.com/p/12345678', 'https://example.com/about'];

      const { warnings } = StoreOnboardingManager.analyzeUrls(urls);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('no identifiable product ID pattern');
    });
  });

  // --------------------------------------------------------------------------
  // Code Generation Tests
  // --------------------------------------------------------------------------

  describe('generatePatternCode', () => {
    it('should generate pathname pattern for numeric IDs', () => {
      const pattern = StoreOnboardingManager.generatePatternCode({
        type: 'pathname',
        description: 'Numeric ID in pathname',
        confidence: 'high',
        format: 'numeric',
        exampleUrls: ['https://example.com/p/12345'],
        exampleIds: ['12345'],
      });

      expect(pattern.type).toBe('pathname');
      expect(pattern.tsRegexBuilderCode).toContain('buildRegExp');
      expect(pattern.tsRegexBuilderCode).toContain('digit');
    });

    it('should generate search pattern for query params', () => {
      const pattern = StoreOnboardingManager.generatePatternCode({
        type: 'search_param',
        description: 'ID in skuid param',
        confidence: 'high',
        format: 'numeric',
        searchParamName: 'skuid',
        exampleUrls: ['https://example.com/p?skuid=12345'],
        exampleIds: ['12345'],
      });

      expect(pattern.type).toBe('search');
      expect(pattern.tsRegexBuilderCode).toContain('skuid');
    });
  });

  describe('generateStoreConfig', () => {
    it('should generate valid store config code', () => {
      const patterns = [
        {
          type: 'pathname' as const,
          tsRegexBuilderCode: "buildRegExp(['/', capture(oneOrMore(digit))])",
          comment: '// Matches numeric ID',
          rawRegex: '/\\/(\\d+)/',
        },
      ];

      const config = StoreOnboardingManager.generateStoreConfig(
        '12345',
        'Example Store',
        'example.com',
        patterns,
      );

      expect(config).toContain("id: '12345'");
      expect(config).toContain("domain: 'example.com'");
      expect(config).toContain('pathnamePatterns:');
      expect(config).toContain('Example Store');
    });
  });

  // --------------------------------------------------------------------------
  // Fixture Generation Tests
  // --------------------------------------------------------------------------

  describe('generateFixture', () => {
    it('should generate valid fixture JSON', () => {
      const testCases = [
        { url: 'https://example.com/p/12345', expectedSkus: ['12345'] },
        { url: 'https://example.com/p/67890', expectedSkus: ['67890'] },
      ];

      const fixture = StoreOnboardingManager.generateFixture(
        'Example Store',
        '12345',
        'example.com',
        testCases,
      );

      const parsed = JSON.parse(fixture);
      expect(parsed.name).toBe('Example Store');
      expect(parsed.id).toBe(12345);
      expect(parsed.domain).toBe('example.com');
      expect(parsed.testCases).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // File Operations Integration Tests
  // --------------------------------------------------------------------------

  describe('file operations', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `mcp-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      // Create mock directory structure
      const packagesDir = join(tempDir, 'packages');
      const storeRegistryDir = join(packagesDir, 'store-registry', 'src');
      const fixturesDir = join(packagesDir, 'product-id-extractor', 'src', '__fixtures__');

      await mkdir(storeRegistryDir, { recursive: true });
      await mkdir(fixturesDir, { recursive: true });

      // Create mock config.ts
      const mockConfig = `import {
  buildRegExp,
  capture,
  digit,
  oneOrMore,
} from 'ts-regex-builder';

const mutableStoreConfigs = [
  // Existing Store
  {
    id: '1',
    domain: 'existing.com',
    pathnamePatterns: [],
  },
];

export const storeConfigs = mutableStoreConfigs;
`;
      await writeFile(join(storeRegistryDir, 'config.ts'), mockConfig);

      // Set the root path for tests
      StoreOnboardingManager.setRootPath(tempDir);
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should check if store exists by ID', async () => {
      const result = await StoreOnboardingManager.checkStoreExists('1');

      expect(result.exists).toBe(true);
      expect(result.existingById).toBe(true);
    });

    it('should check if store exists by domain', async () => {
      const result = await StoreOnboardingManager.checkStoreExists(undefined, 'existing.com');

      expect(result.exists).toBe(true);
      expect(result.existingByDomain).toBe(true);
    });

    it('should return false for non-existent store', async () => {
      const result = await StoreOnboardingManager.checkStoreExists('99999', 'nonexistent.com');

      expect(result.exists).toBe(false);
    });

    it('should write and read fixture files', async () => {
      const fixtureContent = StoreOnboardingManager.generateFixture(
        'Test Store',
        '99999',
        'test.com',
        [{ url: 'https://test.com/p/123', expectedSkus: ['123'] }],
      );

      const filePath = await StoreOnboardingManager.writeFixture('test.com', fixtureContent);
      expect(filePath).toContain('test.com.json');

      const exists = await StoreOnboardingManager.fixtureExists('test.com');
      expect(exists).toBe(true);

      const fixture = await StoreOnboardingManager.readFixture('test.com');
      expect(fixture).not.toBeNull();
      expect(fixture!.name).toBe('Test Store');
    });

    it('should append test cases to existing fixture', async () => {
      // Create initial fixture
      const initialContent = StoreOnboardingManager.generateFixture(
        'Test Store',
        '99999',
        'test.com',
        [{ url: 'https://test.com/p/123', expectedSkus: ['123'] }],
      );
      await StoreOnboardingManager.writeFixture('test.com', initialContent);

      // Append new test cases
      const result = await StoreOnboardingManager.appendToFixture('test.com', [
        { url: 'https://test.com/p/456', expectedSkus: ['456'] },
        { url: 'https://test.com/p/123', expectedSkus: ['123'] }, // Duplicate
      ]);

      expect(result.success).toBe(true);
      expect(result.added).toBe(1);
      expect(result.duplicates).toBe(1);

      // Verify fixture has both test cases
      const fixture = await StoreOnboardingManager.readFixture('test.com');
      expect(fixture!.testCases).toHaveLength(2);
    });

    it('should return error when appending to non-existent fixture', async () => {
      const result = await StoreOnboardingManager.appendToFixture('nonexistent.com', [
        { url: 'https://nonexistent.com/p/123', expectedSkus: ['123'] },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling Tests
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('should handle malformed URLs gracefully', () => {
      const result = StoreOnboardingManager.analyzeUrl('not-a-valid-url');

      expect(result.extractedIds).toHaveLength(0);
    });

    it('should normalize URLs consistently', () => {
      const variations = [
        'https://example.com/product/123',
        'HTTPS://EXAMPLE.COM/PRODUCT/123',
        'https://example.com/product/123/',
        'example.com/product/123',
      ];

      const normalized = variations.map((url) => StoreOnboardingManager.normalizeUrl(url));

      // All should normalize to same format (lowercase, no trailing slash)
      expect(new Set(normalized).size).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Full Workflow Integration Test
  // --------------------------------------------------------------------------

  describe('full workflow', () => {
    it('should complete full analysis workflow with mock URLs', () => {
      // Use URLs with clear numeric IDs that our analyzer can detect
      const mockUrls = [
        'https://example.com/p/12345678',
        'https://example.com/p/23456789',
        'https://example.com/p/34567890',
        'https://example.com/p/45678901',
        'https://example.com/p/56789012',
      ];

      // Step 1: Filter URLs
      const { productUrls } = StoreOnboardingManager.filterUrls(mockUrls, 'example.com');
      expect(productUrls).toHaveLength(5);

      // Step 2: Analyze URLs
      const { results, patterns } = StoreOnboardingManager.analyzeUrls(productUrls);
      expect(results.length).toBe(5);
      expect(results.every((r) => r.extractedIds.length > 0)).toBe(true);

      // Step 3: Generate patterns
      if (patterns.length > 0) {
        const generated = patterns.map((p) => StoreOnboardingManager.generatePatternCode(p));
        expect(generated.length).toBeGreaterThan(0);

        // Step 4: Generate config
        const config = StoreOnboardingManager.generateStoreConfig(
          '99999',
          'Example Store',
          'example.com',
          generated,
        );
        expect(config).toContain("id: '99999'");

        // Step 5: Generate fixture
        const testCases = results
          .filter((r) => r.extractedIds.length > 0)
          .map((r) => ({
            url: r.originalUrl,
            expectedSkus: r.extractedIds,
          }));

        const fixture = StoreOnboardingManager.generateFixture(
          'Example Store',
          '99999',
          'example.com',
          testCases,
        );
        const parsed = JSON.parse(fixture);
        expect(parsed.testCases.length).toBe(5);
      }
    });
  });
});
