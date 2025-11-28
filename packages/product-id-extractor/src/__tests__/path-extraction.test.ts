import { describe, expect, it } from 'vitest';

import { parseUrlComponents } from '@rr/url-parser';

import { extractIdsFromUrlComponents } from '../extractor';
import { config } from '../config';
import { END_OF_STRING_CHARS, assertProductIdsMatch } from './test-utils';

describe('Path extraction patterns', () => {
  it('should extract p type ids in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/p123456789',
      expectedSkus: ['p123456789', '123456789'],
    });
  });

  it('should extract prod type ids in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/prod123456789',
      expectedSkus: ['prod123456789', '123456789'],
    });
  });

  it('should extract prd type ids in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/prd123456789',
      expectedSkus: ['prd123456789', '123456789'],
    });
  });

  it('should extract - type ids in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/prod-123456789/prd-123456789/p-123456789',
      expectedSkus: ['prod-123456789', '123456789', 'prd-123456789', 'p-123456789'],
    });
  });

  it('should extract with trailing / in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/p123456789/',
      expectedSkus: ['p123456789', '123456789'],
    });
  });

  it('should extract with trailing ? in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/p123456789?',
      expectedSkus: ['p123456789', '123456789'],
    });
  });

  it('should extract with trailing $ in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/p123456789$',
      expectedSkus: ['p123456789', '123456789'],
    });
  });

  it('should extract when part of larger word in paths', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product-p123456789-hello',
      expectedSkus: ['p123456789', '123456789'],
    });
  });

  it('should extract ids with longer digit sequences', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/p123456789012345',
      expectedSkus: ['p123456789012345', '123456789012345'],
    });
  });

  it('should extract ids when multiple valid patterns exist', () => {
    assertProductIdsMatch({
      url: 'https://example.com/p123456789/prod987654321',
      expectedSkus: ['p123456789', '123456789', 'prod987654321', '987654321'],
    });
  });

  it('should not extract ids with less than 6 digits', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/p12345',
      expectedSkus: [],
    });
  });

  it('should extract ids at the beginning of the path', () => {
    assertProductIdsMatch({
      url: 'https://example.com/p123456789/category',
      expectedSkus: ['p123456789', '123456789'],
    });
  });

  it('should handle mixed case product identifiers', () => {
    assertProductIdsMatch({
      url: 'https://example.com/PROD123456789/Prd987654321',
      expectedSkus: ['prod123456789', '123456789', 'prd987654321', '987654321'],
    });
  });

  it('should handle URLs with mixed endOfLines', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product/prod-123456789/prd-123456789/p-123456789',
      expectedSkus: ['prod-123456789', '123456789', 'prd-123456789', 'p-123456789'],
    });
  });

  it('should handle URLs with different end-of-string characters', () => {
    const baseUrl = 'https://example.com/product/prod-123456789/prd-123456789/p-123456789';

    END_OF_STRING_CHARS.forEach((endChar) => {
      assertProductIdsMatch({
        url: `${baseUrl}${endChar}`,
        expectedSkus: ['prod-123456789', '123456789', 'prd-123456789', 'p-123456789'],
      });
    });
  });

  it('should not exceed maximum number of results defined in config', () => {
    assertProductIdsMatch({
      url: 'https://example.com/p111111111/p222222222/p333333333/p444444444/p555555555/p666666666/p777777777/p888888888/p999999999/p000000000/p121212121/p131313131/p141414141',
      expectedSkus: [
        'p111111111',
        '111111111',
        'p222222222',
        '222222222',
        'p333333333',
        '333333333',
        'p444444444',
        '444444444',
        'p555555555',
        '555555555',
        'p666666666',
        '666666666',
      ], // Only 12 results total (6 pairs of IDs) due to PATTERN_EXTRACTOR_MAX_RESULTS
    });
  });

  it('should ensure result array length never exceeds MAX_RESULTS', () => {
    const url =
      'https://example.com/p111111111/p222222222/p333333333/p444444444/p555555555/p666666666/p777777777/p888888888/p999999999/p000000000/p121212121/p131313131/p141414141';

    const urlComponents = parseUrlComponents(url);

    const ids = [...extractIdsFromUrlComponents({ urlComponents }).productIds]
      .map((sku) => sku.toLowerCase())
      .sort();

    expect(ids.length).toBeLessThanOrEqual(config.MAX_RESULTS);
  });
});
