import { describe, it } from 'vitest';
import { assertProductIdsMatch } from './testUtilities';

describe('Query extraction patterns', () => {
  it('should extract digits in query params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=123456789',
      expectedSkus: ['123456789'],
    });
  });

  it('should extract words in query params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=abcdefghij',
      expectedSkus: ['abcdefghij'],
    });
  });

  it('should extract digits & words in query params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=1234abcdefghij',
      expectedSkus: ['1234abcdefghij'],
    });
  });

  it('should extract with _ in query params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=1234_abcdef_ghij',
      expectedSkus: ['1234_abcdef_ghij'],
    });
  });

  it('should extract with - in query params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=1234-abcdef-ghij',
      expectedSkus: ['1234-abcdef-ghij'],
    });
  });

  it('should extract with a mixed combo in query params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=6h1g-72ha_822h',
      expectedSkus: ['6h1g-72ha_822h'],
    });
  });

  it('should extract with multiple params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=12345&id=abcdefg',
      expectedSkus: ['12345', 'abcdefg'],
    });
  });

  it('should extract with multiple of the same params', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=12345&sku=abcdefg',
      expectedSkus: ['12345', 'abcdefg'],
    });
  });

  it('should handle minimum length identifiers', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=1234',
      expectedSkus: ['1234'],
    });
  });

  it('should handle maximum length identifiers', () => {
    assertProductIdsMatch({
      url: `https://example.com/product?sku=${'a'.repeat(24)}`,
      expectedSkus: ['a'.repeat(24)],
    });
  });

  it('should not extract identifiers that are too short', () => {
    assertProductIdsMatch({
      url: 'https://example.com/product?sku=123',
      expectedSkus: [],
    });
  });
});
