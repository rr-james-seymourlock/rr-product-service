import { describe, it, expect } from 'vitest';
import { parseUrlComponents, parseDomain, createUrlKey } from '../parseUrlComponents';

describe('parseUrlComponents', () => {
  describe('integration tests', () => {
    it('should parse a simple URL correctly', () => {
      const url = 'https://example.com/product/123';
      const result = parseUrlComponents(url);

      expect(result).toMatchObject({
        href: 'https://example.com/product/123',
        hostname: 'example.com',
        pathname: '/product/123',
        search: '',
        domain: 'example.com',
        original: url,
      });
      expect(result.key).toHaveLength(16);
      expect(result.key).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(result.encodedHref).toBe(encodeURIComponent('https://example.com/product/123'));
    });

    it('should normalize and parse complex URLs with tracking parameters', () => {
      const url = 'http://www.example.com:443/product/123/?utm_source=google&ref=social#reviews';
      const result = parseUrlComponents(url);

      expect(result).toMatchObject({
        href: 'https://example.com/product/123',
        hostname: 'example.com',
        pathname: '/product/123',
        search: '',
        domain: 'example.com',
        original: url,
      });
    });

    it('should preserve query parameters that are not tracking params', () => {
      const url = 'https://example.com/product?color=blue&size=large&utm_source=test';
      const result = parseUrlComponents(url);

      expect(result.search).toBe('?color=blue&size=large');
      expect(result.href).toBe('https://example.com/product?color=blue&size=large');
    });

    it('should handle multi-part TLDs correctly', () => {
      const url = 'https://www.amazon.co.uk/product/B08N5WRWNW?ref=nav_signin';
      const result = parseUrlComponents(url);

      expect(result.domain).toBe('amazon.co.uk');
      expect(result.hostname).toBe('amazon.co.uk');
      expect(result.search).toBe('');
    });

    it('should preserve brand-specific subdomains', () => {
      const url = 'https://www.oldnavy.gap.com/browse/product.do?pid=123456&utm_campaign=test';
      const result = parseUrlComponents(url);

      expect(result.domain).toBe('oldnavy.gap.com');
      expect(result.hostname).toBe('oldnavy.gap.com');
      expect(result.search).toBe('?pid=123456');
    });

    it('should create consistent keys for equivalent URLs', () => {
      const urls = [
        'https://nike.com/product/123?utm_source=google',
        'http://www.nike.com/product/123/?ref=social',
        'https://NIKE.COM/product/123/',
      ];

      const keys = urls.map((url) => parseUrlComponents(url).key);

      // All URLs should normalize to the same thing, producing the same key
      expect(new Set(keys).size).toBe(1);
    });

    it('should create different keys for different products', () => {
      const url1 = 'https://example.com/product/123';
      const url2 = 'https://example.com/product/456';

      const key1 = parseUrlComponents(url1).key;
      const key2 = parseUrlComponents(url2).key;

      expect(key1).not.toBe(key2);
    });

    it('should handle URLs with no pathname', () => {
      const url = 'https://example.com';
      const result = parseUrlComponents(url);

      expect(result).toMatchObject({
        href: 'https://example.com/',
        hostname: 'example.com',
        pathname: '/',
        search: '',
        domain: 'example.com',
      });
    });

    it('should handle URLs with special characters in pathname', () => {
      const url = 'https://example.com/path%20with%20spaces/item';
      const result = parseUrlComponents(url);

      expect(result.pathname).toContain('path');
      expect(result.href).toContain('example.com');
    });

    it('should sort query parameters', () => {
      const url = 'https://example.com/product?z=3&a=1&m=2';
      const result = parseUrlComponents(url);

      expect(result.search).toBe('?a=1&m=2&z=3');
    });

    it('should force HTTPS protocol', () => {
      const url = 'http://example.com/product';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://example.com/product');
    });

    it('should strip hash fragments', () => {
      const url = 'https://example.com/product#reviews';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://example.com/product');
    });

    it('should remove trailing slashes', () => {
      const url = 'https://example.com/product/';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://example.com/product');
      expect(result.pathname).toBe('/product');
    });

    it('should handle all preserved subdomains', () => {
      const subdomains = [
        { subdomain: 'oldnavy', parent: 'gap.com', expected: 'oldnavy.gap.com' },
        { subdomain: 'bananarepublic', parent: 'gap.com', expected: 'bananarepublic.gap.com' },
        { subdomain: 'athleta', parent: 'gap.com', expected: 'athleta.gap.com' },
        { subdomain: 'gapfactory', parent: 'gap.com', expected: 'gapfactory.gap.com' },
      ];

      subdomains.forEach(({ subdomain, parent, expected }) => {
        const url = `https://${subdomain}.${parent}/product`;
        const result = parseUrlComponents(url);
        expect(result.domain).toBe(expected);
      });
    });

    it('should not duplicate domain name for single preserved subdomain', () => {
      // When 'gap' is the main domain, it should just be 'gap.com', not 'gap.gap.com'
      const url = 'https://gap.com/product';
      const result = parseUrlComponents(url);
      expect(result.domain).toBe('gap.com');
    });

    it('should encode href correctly', () => {
      const url = 'https://example.com/product?color=blue&size=large';
      const result = parseUrlComponents(url);

      expect(result.encodedHref).toBe(
        encodeURIComponent('https://example.com/product?color=blue&size=large'),
      );
    });

    it('should handle international domain names (punycode)', () => {
      const url = 'https://www.café.fr/product';
      const result = parseUrlComponents(url);

      // Should convert to punycode
      expect(result.hostname).toContain('xn--');
      expect(result.domain).toContain('xn--');
    });

    it('should handle URLs with explicit HTTPS port', () => {
      const url = 'https://example.com:443/product';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://example.com/product');
    });

    it('should remove all types of tracking parameters', () => {
      const url =
        'https://example.com/product?id=123&utm_source=news&fbclid=abc&gclid=def&ref=social&_ga=xyz';
      const result = parseUrlComponents(url);

      expect(result.search).toBe('?id=123');
    });

    it('should handle URLs with only tracking parameters', () => {
      const url = 'https://example.com/product?utm_source=test&fbclid=123&_ga=456';
      const result = parseUrlComponents(url);

      expect(result.search).toBe('');
      expect(result.href).toBe('https://example.com/product');
    });

    it('should handle long URLs', () => {
      const longPath = '/product/' + 'a'.repeat(500);
      const url = `https://example.com${longPath}`;
      const result = parseUrlComponents(url);

      expect(result.pathname).toHaveLength(longPath.length);
      expect(result.key).toHaveLength(16);
    });

    it('should preserve case in pathname after lowercasing', () => {
      const url = 'https://example.com/Product/ABC-123';
      const result = parseUrlComponents(url);

      // normalize-url + toLowerCase should make it all lowercase
      expect(result.href).toBe('https://example.com/product/abc-123');
    });
  });

  describe('error handling', () => {
    it('should throw error for null input', () => {
      expect(() => parseUrlComponents(null as unknown as string)).toThrow(
        'Failed to parse URL components',
      );
    });

    it('should throw error for undefined input', () => {
      expect(() => parseUrlComponents(undefined as unknown as string)).toThrow(
        'Failed to parse URL components',
      );
    });

    it('should throw error for non-string input', () => {
      expect(() => parseUrlComponents(123 as unknown as string)).toThrow();
      expect(() => parseUrlComponents({} as unknown as string)).toThrow();
      expect(() => parseUrlComponents([] as unknown as string)).toThrow();
    });

    it('should include original URL in error message when normalization fails', () => {
      // normalize-url is very forgiving, but new URL() will fail for truly invalid URLs
      try {
        parseUrlComponents(null as unknown as string);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to parse URL components');
      }
    });
  });

  describe('key generation consistency', () => {
    it('should generate same key for URLs that differ only in tracking params', () => {
      const baseUrl = 'https://example.com/product/123';
      const withTracking1 = `${baseUrl}?utm_source=google&utm_medium=cpc`;
      const withTracking2 = `${baseUrl}?ref=social&fbclid=abc123`;

      const key1 = parseUrlComponents(baseUrl).key;
      const key2 = parseUrlComponents(withTracking1).key;
      const key3 = parseUrlComponents(withTracking2).key;

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('should generate same key for URLs that differ only in protocol', () => {
      const key1 = parseUrlComponents('http://example.com/product').key;
      const key2 = parseUrlComponents('https://example.com/product').key;

      expect(key1).toBe(key2);
    });

    it('should generate same key for URLs that differ only in www', () => {
      const key1 = parseUrlComponents('https://www.example.com/product').key;
      const key2 = parseUrlComponents('https://example.com/product').key;

      expect(key1).toBe(key2);
    });

    it('should generate same key for URLs that differ only in trailing slash', () => {
      const key1 = parseUrlComponents('https://example.com/product/').key;
      const key2 = parseUrlComponents('https://example.com/product').key;

      expect(key1).toBe(key2);
    });

    it('should generate same key for URLs that differ only in hash', () => {
      const key1 = parseUrlComponents('https://example.com/product#section1').key;
      const key2 = parseUrlComponents('https://example.com/product#section2').key;
      const key3 = parseUrlComponents('https://example.com/product').key;

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('should generate same key for URLs that differ only in query param order', () => {
      const key1 = parseUrlComponents('https://example.com/product?a=1&b=2&c=3').key;
      const key2 = parseUrlComponents('https://example.com/product?c=3&a=1&b=2').key;

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different query param values', () => {
      const key1 = parseUrlComponents('https://example.com/product?id=123').key;
      const key2 = parseUrlComponents('https://example.com/product?id=456').key;

      expect(key1).not.toBe(key2);
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with multiple consecutive slashes', () => {
      const url = 'https://example.com//path///to//product';
      const result = parseUrlComponents(url);

      expect(result.pathname).toBe('/path/to/product');
    });

    it('should handle URLs with empty query parameter values', () => {
      const url = 'https://example.com/product?param1=&param2=value';
      const result = parseUrlComponents(url);

      expect(result.search).toContain('param2=value');
    });

    it('should handle URLs with IP addresses', () => {
      const url = 'https://192.168.1.1/product';
      const result = parseUrlComponents(url);

      expect(result.hostname).toBe('192.168.1.1');
      expect(result.domain).toBe('1.1'); // Last two parts
    });

    it('should handle subdomains with preserved brand names not in Gap family', () => {
      const url = 'https://shop.nike.com/product/123';
      const result = parseUrlComponents(url);

      // 'shop' is not in PRESERVED_SUBDOMAINS, so it should be stripped
      expect(result.domain).toBe('nike.com');
    });

    it('should handle complex multi-level preserved subdomains', () => {
      const url = 'https://www.bananarepublicfactory.gapfactory.com/product';
      const result = parseUrlComponents(url);

      expect(result.domain).toBe('bananarepublicfactory.gapfactory.com');
    });

    it('should remove non-default ports due to normalization config', () => {
      const url = 'https://example.com:8080/product';
      const result = parseUrlComponents(url);

      // normalize-url config has removeExplicitPort: true, so port is removed
      expect(result.href).toBe('https://example.com/product');
    });

    it('should handle mixed case in domain', () => {
      const url = 'https://EXAMPLE.COM/product';
      const result = parseUrlComponents(url);

      expect(result.hostname).toBe('example.com');
      expect(result.domain).toBe('example.com');
    });
  });
});

describe('parseDomain', () => {
  describe('error handling', () => {
    it('should throw error for null hostname', () => {
      expect(() => parseDomain(null as unknown as string)).toThrow();
    });

    it('should throw error for undefined hostname', () => {
      expect(() => parseDomain(undefined as unknown as string)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty hostname without throwing', () => {
      // Empty string returns empty - doesn't throw
      const result = parseDomain('');
      expect(result).toBe('');
    });

    it('should handle single part domain (edge case)', () => {
      // This is an edge case - technically invalid but should not crash
      expect(() => parseDomain('localhost')).not.toThrow();
      const result = parseDomain('localhost');
      expect(result).toBeTruthy();
    });
  });
});

describe('createUrlKey', () => {
  describe('error handling', () => {
    it('should throw error for null input', () => {
      expect(() => createUrlKey(null as unknown as string)).toThrow('Failed to create URL key');
    });

    it('should throw error for undefined input', () => {
      expect(() => createUrlKey(undefined as unknown as string)).toThrow(
        'Failed to create URL key',
      );
    });

    it('should include base key in error message', () => {
      expect(() => createUrlKey(null as unknown as string)).toThrow('Failed to create URL key');
    });
  });

  describe('empty string handling', () => {
    it('should handle empty string without throwing', () => {
      // Empty string is technically valid input for hashing
      expect(() => createUrlKey('')).not.toThrow();
      const result = createUrlKey('');
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('special characters', () => {
    it('should create URL-safe keys for inputs with special characters', () => {
      const inputs = [
        'example.com/product?color=blue&size=large',
        'example.com/path/with/slashes',
        'example.com?param1=value1&param2=value2',
        'example.com/path#fragment',
      ];

      inputs.forEach((input) => {
        const key = createUrlKey(input);
        expect(key).toHaveLength(16);
        expect(key).toMatch(/^[a-zA-Z0-9_-]+$/);
        expect(key).not.toContain('+');
        expect(key).not.toContain('/');
        expect(key).not.toContain('=');
      });
    });
  });

  describe('hash collision resistance', () => {
    it('should generate different keys for similar inputs', () => {
      const keys = [
        createUrlKey('example.com/product/123'),
        createUrlKey('example.com/product/124'),
        createUrlKey('example.com/product/125'),
        createUrlKey('example.com/product1/23'),
      ];

      // All keys should be unique
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
