import { describe, it, expect } from 'vitest';
import { extractIdsFromUrlComponents } from '../extractIdsFromUrlComponents';
import { parseUrlComponents } from '@/lib/parseUrlComponents';
import { getStoreConfig } from '@/lib/storeRegistry';

describe('Domain-specific search patterns', () => {
  it('should extract IDs from query parameters using domain-specific searchPatterns', () => {
    const url = 'https://test-search.example.com/product?productId=abc123def';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    expect(ids).toContain('abc123def');
  });

  it('should extract multiple IDs from multiple search patterns', () => {
    const url = 'https://test-search.example.com/product?productId=prod123456&sku=sku-987654';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    expect(ids).toContain('prod123456');
    expect(ids).toContain('sku-987654');
  });

  it('should extract IDs from both pathname and search patterns', () => {
    const url =
      'https://test-search.example.com/product/test-999888?productId=query123456&sku=sku-444333';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    // From pathname pattern (captures only the digits)
    expect(ids).toContain('999888');

    // From search patterns
    expect(ids).toContain('query123456');
    expect(ids).toContain('sku-444333');
  });

  it('should handle URLs with search patterns but no pathname matches', () => {
    const url = 'https://test-search.example.com/other-page?productId=searchonly123';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    expect(ids).toContain('searchonly123');
  });

  it('should verify test store has searchPatterns configured', () => {
    const config = getStoreConfig({ id: 'test-search-patterns' });

    expect(config).toBeDefined();
    expect(config?.searchPatterns).toBeDefined();
    expect(config?.searchPatterns?.length).toBeGreaterThan(0);
  });

  it('should handle complex query parameters with special characters', () => {
    const url =
      'https://test-search.example.com/product?utm_source=google&productId=complex-id_123&ref=home';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    expect(ids).toContain('complex-id_123');
  });

  it('should respect minimum length requirements in search patterns', () => {
    // productId pattern requires min 6 chars, sku pattern requires min 4 chars
    const url = 'https://test-search.example.com/product?productId=abc&sku=xyz';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    // Both should be rejected (too short)
    expect(ids).not.toContain('abc');
    expect(ids).not.toContain('xyz');
  });

  it('should extract IDs from search patterns that meet minimum length', () => {
    const url = 'https://test-search.example.com/product?productId=abcdef&sku=wxyz';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    expect(ids).toContain('abcdef'); // Meets 6 char minimum for productId
    expect(ids).toContain('wxyz'); // Meets 4 char minimum for sku
  });

  it('should extract IDs from only search patterns when no pathname match', () => {
    // URL with no pathname pattern match, only search pattern matches
    const url =
      'https://test-search.example.com/no-pattern-here?productId=search123456&sku=search-abc';
    const urlComponents = parseUrlComponents(url);

    const ids = extractIdsFromUrlComponents({
      urlComponents,
      storeId: 'test-search-patterns',
    });

    // Should extract from search patterns only
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain('search123456');
    expect(ids).toContain('search-abc');
  });
});
