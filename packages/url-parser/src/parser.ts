import { createHash } from 'node:crypto';
import normalizeUrl from 'normalize-url';
import { parse as parseDomainParts } from 'tldts';

import { config } from './config';
import {
  type URLComponents,
  baseKeySchema,
  hostnameSchema,
  urlComponentsSchema,
  urlInputSchema,
} from './types';

// Re-export the type for backward compatibility
export type { URLComponents };

/**
 * Extracts the normalized domain from a hostname.
 *
 * @param hostname - Hostname to parse (e.g., 'www.shop.nike.com')
 * @returns Normalized domain (e.g., 'nike.com')
 *
 * @throws {Error} If hostname is invalid or cannot be parsed
 *
 * @example
 * ```typescript
 * parseDomain('www.nike.com'); // 'nike.com'
 * parseDomain('www.amazon.co.uk'); // 'amazon.co.uk'
 * parseDomain('www.oldnavy.gap.com'); // 'oldnavy.gap.com'
 * ```
 */
export const parseDomain = (hostname: unknown): string => {
  // Validate input
  const validatedHostname = hostnameSchema.parse(hostname);

  try {
    const parsed = parseDomainParts(validatedHostname, { allowPrivateDomains: true });
    if (parsed.isIp) {
      return validatedHostname;
    }

    const baseDomain = parsed.domain ?? validatedHostname;
    const subdomainParts = parsed.subdomain ? parsed.subdomain.split('.') : [];
    const preservedSubdomain = subdomainParts.find((part) => config.PRESERVED_SUBDOMAINS.has(part));

    if (preservedSubdomain === undefined || baseDomain.startsWith(`${preservedSubdomain}.`)) {
      return baseDomain;
    }

    return `${preservedSubdomain}.${baseDomain}`;
  } catch (error) {
    throw new Error(
      `Failed to parse domain for "${validatedHostname}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Generates a unique, URL-safe key from a string.
 *
 * @param baseKey - String to hash (typically `${domain}${pathname}${search}`)
 * @returns 16-character URL-safe key
 *
 * @throws {Error} If baseKey is invalid or hashing fails
 *
 * @example
 * ```typescript
 * createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR_'
 * createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR_' (same input = same key)
 * createUrlKey('nike.com/product/124'); // 'aB1_cD4eF-gH5iJ_' (different)
 * ```
 */
export const createUrlKey = (baseKey: unknown): string => {
  // Validate input
  const validatedBaseKey = baseKeySchema.parse(baseKey);

  try {
    return createHash('sha1')
      .update(validatedBaseKey)
      .digest('base64')
      .slice(0, 16)
      .replaceAll(/[+/=]/g, '_')
      .replaceAll('/', '-');
  } catch (error) {
    throw new Error(
      `Failed to create URL key for "${validatedBaseKey}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Normalizes and parses a URL into structured components.
 *
 * Features:
 * - URL normalization (removes tracking parameters, forces HTTPS, strips WWW)
 * - Domain parsing (handles multi-part TLDs like co.uk, com.au)
 * - Unique key generation (SHA-1 based, URL-safe, 16 characters)
 * - Brand subdomain preservation (oldnavy.gap.com, etc.)
 *
 * Performance:
 * - Development: Full Zod validation (catch all edge cases)
 * - Production: Native URL validation + lightweight checks (2μs vs 5-10μs)
 *
 * @param url - The URL to parse and normalize
 * @returns URLComponents object with normalized URL data
 *
 * @throws {ZodError} If URL is invalid, empty, or not HTTP(S) (development only)
 * @throws {Error} If URL cannot be parsed or normalized
 *
 * @example
 * ```typescript
 * const url = 'https://www.nike.com/t/air-max-270-mens-shoe/AH8050-001?utm_source=google';
 * const components = parseUrlComponents(url);
 * // {
 * //   href: 'https://nike.com/t/air-max-270-mens-shoe/ah8050-001',
 * //   encodedHref: 'https%3A%2F%2Fnike.com%2Ft%2Fair-max-270-mens-shoe%2Fah8050-001',
 * //   hostname: 'nike.com',
 * //   pathname: '/t/air-max-270-mens-shoe/ah8050-001',
 * //   search: '',
 * //   domain: 'nike.com',
 * //   key: 'abc123_defg4567',  // SHA-1 hash
 * //   original: 'https://www.nike.com/t/air-max-270-mens-shoe/AH8050-001?utm_source=google'
 * // }
 * ```
 */
export const parseUrlComponents = (url: unknown): URLComponents => {
  let validatedUrl: string;

  if (process.env['NODE_ENV'] === 'development') {
    // Full Zod validation in development
    validatedUrl = urlInputSchema.parse(url);
  } else {
    // Lightweight validation in production
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('URL must be a non-empty string');
    }

    // Native URL constructor validates format (fast, secure)
    try {
      const testUrl = new URL(url);

      // Block dangerous protocols
      if (testUrl.protocol !== 'http:' && testUrl.protocol !== 'https:') {
        throw new Error(
          `Invalid protocol: ${testUrl.protocol}. Only HTTP(S) protocols are allowed`,
        );
      }
    } catch (error) {
      throw new Error(
        `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    validatedUrl = url;
  }

  try {
    const normalized = normalizeUrl(validatedUrl, config.NORMALIZATION_RULES);
    const normalizedUrl = new URL(normalized);
    normalizedUrl.hostname = normalizedUrl.hostname.toLowerCase();
    const href = normalizedUrl.toString();
    const { hostname, pathname, search } = normalizedUrl;

    // Extract the domain removing subdomains and supporting multi part TLD's
    const domain = parseDomain(hostname);

    // Create a unique key per URL for use in Redis and for DynamoDB keys.
    // Pathname and search segments are normalized to lowercase for consistent deduplication.
    const normalizedPathForKey = pathname.toLowerCase();
    const normalizedSearchForKey = search.toLowerCase();
    const baseKey = `${domain}${normalizedPathForKey}${normalizedSearchForKey}`;
    const key = createUrlKey(baseKey);
    const encodedHref = encodeURIComponent(href);

    const result = {
      href,
      encodedHref,
      hostname,
      pathname,
      search,
      domain,
      key,
      original: validatedUrl,
    };

    // Validate output in development only
    if (process.env['NODE_ENV'] === 'development') {
      return urlComponentsSchema.parse(result);
    }

    return result as URLComponents;
  } catch (error) {
    throw new Error(
      `Failed to parse URL components for "${validatedUrl}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
