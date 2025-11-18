import { createHash } from 'node:crypto';
import normalizeUrl from 'normalize-url';
import { config } from './parseUrlComponents.config';
import {
  urlInputSchema,
  urlComponentsSchema,
  hostnameSchema,
  baseKeySchema,
  type URLComponents,
} from './parseUrlComponents.schema';

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
    const hostnameParts = validatedHostname.split('.');

    const baseDomain = config.MULTI_PART_TLDS.has(hostnameParts.slice(-2).join('.'))
      ? hostnameParts.slice(-3).join('.')
      : hostnameParts.slice(-2).join('.');

    const preservedSubdomain = hostnameParts.find((part): part is string =>
      config.PRESERVED_SUBDOMAINS.has(part),
    );

    // Return early if no preserved subdomain or if it's already in the base domain
    if (preservedSubdomain === undefined || baseDomain.includes(preservedSubdomain)) {
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
 * @param url - The URL to parse and normalize
 * @returns URLComponents object with normalized URL data
 *
 * @throws {ZodError} If URL is invalid, empty, or not HTTP(S)
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
  // Validate input - throws ZodError if invalid
  const validatedUrl = urlInputSchema.parse(url);

  try {
    const normalized = normalizeUrl(validatedUrl, config.NORMALIZATION_RULES).toLowerCase();
    const { href, hostname, pathname, search } = new URL(normalized);

    // Extract the domain removing subdomains and supporting multi part TLD's
    const domain = parseDomain(hostname);

    // Create a unique key per URL for use in Redis and for DynamoDB keys
    const baseKey = `${domain}${pathname}${search}`;
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

    // Validate output - ensures internal correctness
    return urlComponentsSchema.parse(result);
  } catch (error) {
    throw new Error(
      `Failed to parse URL components for "${validatedUrl}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
