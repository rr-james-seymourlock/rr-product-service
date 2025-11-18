import { describe, it, expect, vi } from 'vitest';
import { extractIdsFromUrlComponents } from '../extractIdsFromUrlComponents';
import { parseUrlComponents } from '@/lib/parseUrlComponents';
import { ZodError } from 'zod';

vi.mock('@/storeConfigs/storeConfigManager');

describe('extractIdsFromUrlComponents', () => {
  it('should return empty array for URL with no extractable IDs', () => {
    const url = 'https://example.com/page';
    const urlComponents = parseUrlComponents(url);
    const result = extractIdsFromUrlComponents({ urlComponents });
    expect(result).toEqual([]);
  });

  it('should throw ZodError for invalid urlComponents input', () => {
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

    expect(() => extractIdsFromUrlComponents(invalidInput)).toThrow(ZodError);
  });

  it('should throw ZodError for null pathname in urlComponents', () => {
    const invalidInput = {
      urlComponents: {
        href: 'https://example.com',
        pathname: null,
        search: '',
        domain: 'example.com',
        hostname: 'example.com',
      },
    };

    expect(() => extractIdsFromUrlComponents(invalidInput)).toThrow(ZodError);
  });

  it('should throw ZodError for missing urlComponents', () => {
    expect(() => extractIdsFromUrlComponents({ storeId: 'test' })).toThrow(ZodError);
  });

  it('should throw ZodError for empty storeId', () => {
    const url = 'https://example.com/product';
    const urlComponents = parseUrlComponents(url);

    expect(() => extractIdsFromUrlComponents({ urlComponents, storeId: '' })).toThrow(ZodError);
  });

  it('should return frozen array', () => {
    const url = 'https://example.com/product/prod-123456';
    const urlComponents = parseUrlComponents(url);

    const result = extractIdsFromUrlComponents({ urlComponents });

    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toContain('123456');
    expect(result).toContain('prod-123456');
  });
});
