import normalizeUrl from 'normalize-url';
import { describe, expect, it } from 'vitest';

import { config } from '../parseUrlComponents.config';

describe('normalizeUrl', () => {
  it('should normalize the url', () => {
    const url = 'https://www.example.com/path/to/resource?query=param#fragment';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES).toLowerCase();

    expect(normalizedUrl).toBe('https://example.com/path/to/resource?query=param');
  });

  it('should strip www subdomain', () => {
    const url = 'https://www.example.com/path';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path');
  });

  it('should preserve specified subdomains', () => {
    const url = 'https://oldnavy.gap.com/path';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://oldnavy.gap.com/path');
  });

  it('should strip hash fragments', () => {
    const url = 'https://example.com/path#section1';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path');
  });

  it('should remove tracking query parameters', () => {
    const url = 'https://example.com/path?utm_source=test&valid_param=keep&utm_medium=social';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?valid_param=keep');
  });

  it('should force HTTPS protocol', () => {
    const url = 'http://example.com';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com');
  });

  it('should remove trailing slashes', () => {
    const url = 'https://example.com/path/';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path');
  });

  it('should sort query parameters', () => {
    const url = 'https://example.com/path?c=3&a=1&b=2';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?a=1&b=2&c=3');
  });

  it('should remove explicit ports for default protocols', () => {
    const url = 'https://example.com:443/path';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path');
  });

  it('should handle multiple normalization rules together', () => {
    const url = 'http://www.example.com:443/path/?utm_source=test&valid=true#section';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?valid=true');
  });

  it('should remove platform-specific tracking parameters', () => {
    const url = 'https://example.com/product?fbclid=123&msclkid=456&valid=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/product?valid=true');
  });
});

describe('normalizeUrl andremoveQueryParameters', () => {
  it('should remove UTM tracking parameters', () => {
    const url =
      'https://example.com/path?utm_source=newsletter&utm_medium=email&utm_campaign=spring&utm_content=banner&utm_term=shoes&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should remove Facebook tracking parameters', () => {
    const url = 'https://example.com/path?fb_source=feed&fb_ref=share&fbclid=123&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should remove HubSpot tracking parameters', () => {
    const url = 'https://example.com/path?hsa_acc=123&hsa_cam=456&hsa_grp=789&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should remove Google Analytics and AdWords parameters', () => {
    const url = 'https://example.com/path?_ga=123&gclid=abc&gclsrc=aw.ds&_gl=xyz&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should remove generic marketing parameters', () => {
    const url =
      'https://example.com/path?ref=social&source=email&campaign=summer&medium=banner&content=shoes&term=running&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should remove platform-specific marketing parameters', () => {
    const url =
      'https://example.com/path?igshid=123&mc_cid=abc&mc_eid=def&_hsenc=xyz&_hsmi=789&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should remove affiliate tracking parameters', () => {
    const url =
      'https://example.com/path?zanpid=123&affid=456&aff_id=789&affiliate=store&cjevent=abc&keep=true';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?keep=true');
  });

  it('should handle URLs with only tracking parameters', () => {
    const url = 'https://example.com/path?utm_source=test&fbclid=123&_ga=456';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path');
  });

  it('should preserve non-tracking query parameters', () => {
    const url = 'https://example.com/path?color=blue&size=large&utm_source=test&fbclid=123';
    const normalizedUrl = normalizeUrl(url, config.NORMALIZATION_RULES);
    expect(normalizedUrl).toBe('https://example.com/path?color=blue&size=large');
  });
});

describe('normalizeUrl TLD handling', () => {
  it('should handle multi-part TLDs correctly', () => {
    const urls: Array<[string, string]> = [
      ['https://example.co.uk/path', 'https://example.co.uk/path'],
      ['https://www.example.co.uk/path', 'https://example.co.uk/path'],
      ['https://example.com.au/path', 'https://example.com.au/path'],
    ];
    for (const [input, expected] of urls) {
      expect(normalizeUrl(input, config.NORMALIZATION_RULES)).toBe(expected);
    }
  });
});

describe('normalizeUrl edge cases', () => {
  it('should handle empty paths', () => {
    expect(normalizeUrl('https://example.com', config.NORMALIZATION_RULES)).toBe(
      'https://example.com',
    );
  });

  it('should handle multiple consecutive slashes', () => {
    expect(
      normalizeUrl('https://example.com//path///to//resource', config.NORMALIZATION_RULES),
    ).toBe('https://example.com/path/to/resource');
  });

  it('should handle encoded characters', () => {
    expect(
      normalizeUrl('https://example.com/path%20with%20spaces', config.NORMALIZATION_RULES),
    ).toBe('https://example.com/path%20with%20spaces');
  });

  /**
   * Note on International Domain Names (IDNs) and Mixed Scripts:
   * - Domain names with non-ASCII characters are automatically converted to Punycode
   * - This is the correct behavior according to IDNA (Internationalizing Domain Names in Applications)
   * - Example: café.fr -> xn--caf-dma.fr
   * - For mixed-script domains (e.g., cafe-café.com), the entire domain part is converted as a single unit
   *   Example: cafe-café.com -> xn--cafe-caf-i1a.com
   * - The Punycode version is what's actually used in DNS lookups
   * - While the original Unicode version might be displayed to users, the normalized URL should use Punycode
   */

  it('should handle international domains by converting to punycode', () => {
    expect(normalizeUrl('https://www.café.fr/path', config.NORMALIZATION_RULES)).toBe(
      'https://xn--caf-dma.fr/path',
    );
  });

  it('should handle various international domain names', () => {
    const idnTests: Array<[string, string]> = [
      ['https://www.münich.de/path', 'https://xn--mnich-kva.de/path'],
      ['https://www.ünicode.com/test', 'https://xn--nicode-2ya.com/test'],
      ['https://www.café.fr/path', 'https://xn--caf-dma.fr/path'],
      ['https://www.παράδειγμα.δοκιμή/path', 'https://xn--hxajbheg2az3al.xn--jxalpdlp/path'],
    ];

    for (const [input, expected] of idnTests) {
      expect(normalizeUrl(input, config.NORMALIZATION_RULES)).toBe(expected);
    }
  });

  it('should handle mixed-script domains', () => {
    expect(normalizeUrl('https://www.cafe-café.com/path', config.NORMALIZATION_RULES)).toBe(
      'https://xn--cafe-caf-i1a.com/path',
    );
  });

  it('should handle IDN with preserved subdomains', () => {
    expect(normalizeUrl('https://oldnavy.café.com/path', config.NORMALIZATION_RULES)).toBe(
      'https://oldnavy.xn--caf-dma.com/path',
    );
  });
});

describe('normalizeUrl preserved subdomains', () => {
  it('should preserve all configured brand subdomains', () => {
    config.PRESERVED_SUBDOMAINS.forEach((subdomain) => {
      const url = `https://${subdomain}.example.com/path`;
      expect(normalizeUrl(url, config.NORMALIZATION_RULES)).toBe(url);
    });
  });

  it('should handle multiple levels of preserved subdomains', () => {
    expect(normalizeUrl('https://www.oldnavy.gap.com/path', config.NORMALIZATION_RULES)).toBe(
      'https://oldnavy.gap.com/path',
    );
  });
});
