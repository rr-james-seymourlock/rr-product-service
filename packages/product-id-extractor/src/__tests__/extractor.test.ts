import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { parseUrlComponents } from '@rr/url-parser';

import { extractIdsFromUrlComponents } from '../extractor';

vi.mock('@rr/store-registry');

describe('extractIdsFromUrlComponents', () => {
  it('should return empty array for URL with no extractable IDs', () => {
    const url = 'https://example.com/page';
    const urlComponents = parseUrlComponents(url);
    const result = extractIdsFromUrlComponents({ urlComponents });
    expect(result.productIds).toEqual([]);
  });

  describe('development mode validation', () => {
    const originalNodeEnv = process.env['NODE_ENV'];

    beforeEach(() => {
      process.env['NODE_ENV'] = 'development';
    });

    afterEach(() => {
      process.env['NODE_ENV'] = originalNodeEnv;
    });

    it('should throw ZodError for invalid urlComponents input in development', () => {
      const invalidInput = {
        urlComponents: {
          href: '',
          pathname: '',
          search: '',
          domain: 'example.com',
          hostname: '',
          // Missing required fields
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => extractIdsFromUrlComponents(invalidInput as any)).toThrow(ZodError);
    });

    it('should throw ZodError for null pathname in urlComponents in development', () => {
      const invalidInput = {
        urlComponents: {
          href: 'https://example.com',
          pathname: null,
          search: '',
          domain: 'example.com',
          hostname: 'example.com',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => extractIdsFromUrlComponents(invalidInput as any)).toThrow(ZodError);
    });

    it('should throw ZodError for missing urlComponents in development', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => extractIdsFromUrlComponents({ storeId: 'test' } as any)).toThrow(ZodError);
    });

    it('should throw ZodError for empty storeId in development', () => {
      const url = 'https://example.com/product';
      const urlComponents = parseUrlComponents(url);

      expect(() => extractIdsFromUrlComponents({ urlComponents, storeId: '' })).toThrow(ZodError);
    });
  });

  it('should return frozen array', () => {
    const url = 'https://example.com/product/prod-123456';
    const urlComponents = parseUrlComponents(url);

    const result = extractIdsFromUrlComponents({ urlComponents });

    expect(Object.isFrozen(result.productIds)).toBe(true);
    expect(result.productIds).toContain('123456');
    expect(result.productIds).toContain('prod-123456');
  });
});
