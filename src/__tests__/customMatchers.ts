import { expect } from 'vitest';
import { extractIdsFromUrlComponents } from '@/extractIdsFromUrlComponents';
import { parseUrlComponents } from '@/parseUrlComponents';

/**
 * Custom Vitest matchers for product ID validation and URL parsing
 */
expect.extend({
  /**
   * Checks if a string is a valid product ID format
   * Valid IDs contain alphanumeric characters, hyphens, and underscores
   */
  toBeValidProductId(received: string) {
    const isValid = /^[\w-]+$/.test(received) && received.length > 0;
    return {
      pass: isValid,
      message: () =>
        isValid
          ? `Expected ${received} not to be a valid product ID`
          : `Expected ${received} to be a valid product ID (alphanumeric, hyphens, underscores only)`,
      actual: received,
      expected: 'Valid product ID format',
    };
  },

  /**
   * Extracts product IDs from a URL and compares them to expected IDs
   * Handles URL parsing and ID extraction automatically
   */
  toExtractIds(url: string, expectedIds: string[]) {
    const urlComponents = parseUrlComponents(url);
    const result = [...extractIdsFromUrlComponents({ urlComponents })].sort();
    const expected = [...expectedIds].sort();
    const pass = JSON.stringify(result) === JSON.stringify(expected);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${url} not to extract IDs ${JSON.stringify(expected)}`
          : `Expected ${url} to extract ${JSON.stringify(expected)} but got ${JSON.stringify(result)}`,
      actual: result,
      expected,
    };
  },

  /**
   * Extracts product IDs from a URL with a specific store ID
   */
  toExtractIdsForStore(url: string, storeId: string, expectedIds: string[]) {
    const urlComponents = parseUrlComponents(url);
    const result = [...extractIdsFromUrlComponents({ urlComponents, storeId })].sort();
    const expected = [...expectedIds].sort();
    const pass = JSON.stringify(result) === JSON.stringify(expected);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${url} (store: ${storeId}) not to extract IDs ${JSON.stringify(expected)}`
          : `Expected ${url} (store: ${storeId}) to extract ${JSON.stringify(expected)} but got ${JSON.stringify(result)}`,
      actual: result,
      expected,
    };
  },

  /**
   * Validates that a URL normalizes to an expected format
   */
  toNormalizeUrlTo(url: string, expectedHref: string) {
    const { href } = parseUrlComponents(url);
    const pass = href === expectedHref;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${url} not to normalize to ${expectedHref}`
          : `Expected ${url} to normalize to ${expectedHref} but got ${href}`,
      actual: href,
      expected: expectedHref,
    };
  },

  /**
   * Validates that a URL extracts to a specific domain
   */
  toExtractDomain(url: string, expectedDomain: string) {
    const { domain } = parseUrlComponents(url);
    const pass = domain === expectedDomain;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${url} not to extract domain ${expectedDomain}`
          : `Expected ${url} to extract domain ${expectedDomain} but got ${domain}`,
      actual: domain,
      expected: expectedDomain,
    };
  },
});

// Type declarations for TypeScript

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toBeValidProductId(): T;
    toExtractIds(ids: string[]): T;
    toExtractIdsForStore(store: string, ids: string[]): T;
    toNormalizeUrlTo(href: string): T;
    toExtractDomain(domain: string): T;
  }
  interface AsymmetricMatchersContaining {
    toBeValidProductId(): unknown;
    toExtractIds(ids: string[]): unknown;
    toExtractIdsForStore(store: string, ids: string[]): unknown;
    toNormalizeUrlTo(href: string): unknown;
    toExtractDomain(domain: string): unknown;
  }
}
