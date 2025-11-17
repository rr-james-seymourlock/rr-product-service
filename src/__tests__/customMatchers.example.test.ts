import { describe, test, expect } from 'vitest';

/**
 * Example tests demonstrating the custom Vitest matchers
 * These matchers are automatically loaded from customMatchers.ts
 */
describe('Custom Matchers Examples', () => {
  describe('toBeValidProductId', () => {
    test('validates correct product IDs', () => {
      expect('ABC-123-DEF').toBeValidProductId();
      expect('product_456').toBeValidProductId();
      expect('12345678').toBeValidProductId();
    });

    test('rejects invalid product IDs', () => {
      expect(() => expect('').toBeValidProductId()).toThrow();
      expect(() => expect('product with spaces').toBeValidProductId()).toThrow();
      expect(() => expect('product@invalid').toBeValidProductId()).toThrow();
    });
  });

  describe('toExtractIds', () => {
    test('extracts IDs from Target URLs', () => {
      expect('https://www.target.com/p/-/A-12345678').toExtractIds(['12345678']);
      expect('https://www.target.com/p/product-name/-/A-87654321').toExtractIds(['87654321']);
    });

    test('extracts IDs from Nike URLs', () => {
      // Note: URLs are normalized to lowercase
      expect('https://www.nike.com/t/dri-fit-shirt/ABC123-DEF').toExtractIds(['abc123-def']);
    });

    test('handles URLs with no IDs', () => {
      expect('https://www.example.com').toExtractIds([]);
    });
  });

  describe('toExtractIdsForStore', () => {
    test('extracts IDs with specific store context', () => {
      expect('https://www.target.com/p/-/A-12345678').toExtractIdsForStore('5246', ['12345678']);
    });
  });

  describe('toNormalizeUrlTo', () => {
    test('normalizes URLs correctly', () => {
      // Note: normalize-url removes www. and converts to lowercase
      expect('https://WWW.EXAMPLE.COM/path').toNormalizeUrlTo('https://example.com/path');
    });
  });

  describe('toExtractDomain', () => {
    test('extracts domain from URL', () => {
      expect('https://shop.example.com/path').toExtractDomain('example.com');
      expect('https://www.target.com/p/-/A-123').toExtractDomain('target.com');
    });
  });
});
