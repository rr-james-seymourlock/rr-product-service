import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { createUrlKey, parseDomain, parseUrlComponents } from '../parser';

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

    it('should preserve original casing for non-hostname segments', () => {
      const url = 'https://example.com/Product/ABC-123';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://example.com/Product/ABC-123');
      expect(result.pathname).toBe('/Product/ABC-123');
    });

    it('should normalize URLs starting with www. by prepending https://', () => {
      const url = 'www.savagex.com/products/SLEEK-STITCH-JUMPSUIT-NO2500505-1533';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://savagex.com/products/SLEEK-STITCH-JUMPSUIT-NO2500505-1533');
      expect(result.hostname).toBe('savagex.com');
      expect(result.pathname).toBe('/products/SLEEK-STITCH-JUMPSUIT-NO2500505-1533');
      expect(result.domain).toBe('savagex.com');
      expect(result.original).toBe(url);
    });

    it('should normalize www. URLs with query parameters', () => {
      const url = 'www.example.com/product?id=123&color=blue';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://example.com/product?color=blue&id=123');
      expect(result.hostname).toBe('example.com');
      expect(result.pathname).toBe('/product');
      expect(result.search).toBe('?color=blue&id=123');
    });

    it('should normalize www. URLs with multi-part TLDs', () => {
      const url = 'www.amazon.co.uk/product/B08N5WRWNW';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://amazon.co.uk/product/B08N5WRWNW');
      expect(result.domain).toBe('amazon.co.uk');
      expect(result.hostname).toBe('amazon.co.uk');
    });

    it('should normalize www. URLs with subdomains preserved', () => {
      const url = 'www.oldnavy.gap.com/product/123';
      const result = parseUrlComponents(url);

      expect(result.href).toBe('https://oldnavy.gap.com/product/123');
      expect(result.domain).toBe('oldnavy.gap.com');
    });

    it('should create consistent keys for www. and https:// versions of same URL', () => {
      const wwwUrl = 'www.example.com/product/123';
      const httpsUrl = 'https://www.example.com/product/123';

      const wwwResult = parseUrlComponents(wwwUrl);
      const httpsResult = parseUrlComponents(httpsUrl);

      // Both should normalize to the same URL and produce the same key
      expect(wwwResult.key).toBe(httpsResult.key);
      expect(wwwResult.href).toBe(httpsResult.href);
    });
  });

  describe('error handling', () => {
    describe('development mode', () => {
      const originalNodeEnv = process.env['NODE_ENV'];

      beforeEach(() => {
        process.env['NODE_ENV'] = 'development';
      });

      afterEach(() => {
        process.env['NODE_ENV'] = originalNodeEnv;
      });

      it('should throw ZodError for null input in development', () => {
        expect(() => parseUrlComponents(null as unknown as string)).toThrow(ZodError);
      });

      it('should throw ZodError for undefined input in development', () => {
        expect(() => parseUrlComponents(undefined as unknown as string)).toThrow(ZodError);
      });

      it('should throw ZodError for non-string input in development', () => {
        expect(() => parseUrlComponents(123 as unknown as string)).toThrow(ZodError);
        expect(() => parseUrlComponents({} as unknown as string)).toThrow(ZodError);
        expect(() => parseUrlComponents([] as unknown as string)).toThrow(ZodError);
      });

      it('should throw ZodError for empty string in development', () => {
        expect(() => parseUrlComponents('')).toThrow(ZodError);
      });

      it('should throw ZodError for invalid protocols in development', () => {
        expect(() => parseUrlComponents('javascript:alert(1)')).toThrow(ZodError);
        expect(() => parseUrlComponents('data:text/html,test')).toThrow(ZodError);
        expect(() => parseUrlComponents('file:///etc/passwd')).toThrow(ZodError);
      });
    });

    describe('production mode', () => {
      const originalNodeEnv = process.env['NODE_ENV'];

      beforeEach(() => {
        process.env['NODE_ENV'] = 'production';
      });

      afterEach(() => {
        process.env['NODE_ENV'] = originalNodeEnv;
      });

      it('should throw Error for null input in production', () => {
        expect(() => parseUrlComponents(null as unknown as string)).toThrow(
          'URL must be a non-empty string',
        );
      });

      it('should throw Error for undefined input in production', () => {
        expect(() => parseUrlComponents(undefined as unknown as string)).toThrow(
          'URL must be a non-empty string',
        );
      });

      it('should throw Error for non-string input in production', () => {
        expect(() => parseUrlComponents(123 as unknown as string)).toThrow(
          'URL must be a non-empty string',
        );
        expect(() => parseUrlComponents({} as unknown as string)).toThrow(
          'URL must be a non-empty string',
        );
        expect(() => parseUrlComponents([] as unknown as string)).toThrow(
          'URL must be a non-empty string',
        );
      });

      it('should throw Error for empty string in production', () => {
        expect(() => parseUrlComponents('')).toThrow('URL must be a non-empty string');
      });

      it('should throw Error for invalid protocols in production', () => {
        expect(() => parseUrlComponents('javascript:alert(1)')).toThrow('Invalid protocol');
        expect(() => parseUrlComponents('data:text/html,test')).toThrow('Invalid protocol');
        expect(() => parseUrlComponents('file:///etc/passwd')).toThrow('Invalid protocol');
      });

      it('should throw Error for invalid URL format in production', () => {
        expect(() => parseUrlComponents('not a url')).toThrow('Invalid URL format');
      });
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
      expect(result.domain).toBe('192.168.1.1');
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
    it('should throw ZodError for null hostname', () => {
      expect(() => parseDomain(null as unknown as string)).toThrow(ZodError);
    });

    it('should throw ZodError for undefined hostname', () => {
      expect(() => parseDomain(undefined as unknown as string)).toThrow(ZodError);
    });

    it('should throw ZodError for empty hostname', () => {
      expect(() => parseDomain('')).toThrow(ZodError);
    });

    it('should throw ZodError for non-string hostname', () => {
      expect(() => parseDomain(123 as unknown as string)).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
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
    it('should throw ZodError for null input', () => {
      expect(() => createUrlKey(null as unknown as string)).toThrow(ZodError);
    });

    it('should throw ZodError for undefined input', () => {
      expect(() => createUrlKey(undefined as unknown as string)).toThrow(ZodError);
    });

    it('should throw ZodError for non-string input', () => {
      expect(() => createUrlKey(123 as unknown as string)).toThrow(ZodError);
      expect(() => createUrlKey({} as unknown as string)).toThrow(ZodError);
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
