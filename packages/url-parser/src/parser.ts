import { createHash } from 'node:crypto';
import normalizeUrl from 'normalize-url';
import { parse as parseDomainParts } from 'tldts';

import { config } from './config';
import {
  DomainParseError,
  InvalidUrlError,
  UrlKeyGenerationError,
  UrlNormalizationError,
} from './errors';
import { createLogger } from './logger';
import {
  type URLComponents,
  baseKeySchema,
  hostnameSchema,
  urlComponentsSchema,
  urlInputSchema,
} from './types';

const logger = createLogger('url-parser.parser');

/**
 * Extracts the normalized domain from a hostname.
 *
 * @param hostname - Hostname to parse (e.g., 'www.shop.nike.com')
 * @returns Normalized domain (e.g., 'nike.com')
 *
 * @throws {DomainParseError} If hostname cannot be parsed
 *
 * @example
 * ```typescript
 * parseDomain('www.nike.com'); // 'nike.com'
 * parseDomain('www.amazon.co.uk'); // 'amazon.co.uk'
 * parseDomain('www.oldnavy.gap.com'); // 'oldnavy.gap.com'
 * ```
 */
export const parseDomain = (hostname: unknown) => {
  // Validate input
  const validatedHostname = hostnameSchema.parse(hostname);

  logger.debug({ hostname: validatedHostname }, 'Parsing domain');

  try {
    const parsed = parseDomainParts(validatedHostname, { allowPrivateDomains: true });
    if (parsed.isIp) {
      logger.debug({ hostname: validatedHostname }, 'Hostname is IP address');
      return validatedHostname;
    }

    const baseDomain = parsed.domain ?? validatedHostname;
    const subdomainParts = parsed.subdomain ? parsed.subdomain.split('.') : [];
    const preservedSubdomain = subdomainParts.find((part) => config.PRESERVED_SUBDOMAINS.has(part));

    if (preservedSubdomain === undefined || baseDomain.startsWith(`${preservedSubdomain}.`)) {
      logger.debug({ hostname: validatedHostname, domain: baseDomain }, 'Extracted base domain');
      return baseDomain;
    }

    const result = `${preservedSubdomain}.${baseDomain}`;
    logger.debug(
      { hostname: validatedHostname, domain: result, preservedSubdomain },
      'Extracted domain with preserved subdomain',
    );
    return result;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error('Unknown error'),
      `Failed to parse domain: ${validatedHostname}`,
    );
    throw new DomainParseError(
      validatedHostname,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Generates a unique, URL-safe key from a string.
 *
 * @param baseKey - String to hash (typically `${domain}${pathname}${search}`)
 * @returns 16-character URL-safe key
 *
 * @throws {UrlKeyGenerationError} If key generation fails
 *
 * @example
 * ```typescript
 * createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR_'
 * createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR_' (same input = same key)
 * createUrlKey('nike.com/product/124'); // 'aB1_cD4eF-gH5iJ_' (different)
 * ```
 */
export const createUrlKey = (baseKey: unknown) => {
  // Validate input
  const validatedBaseKey = baseKeySchema.parse(baseKey);

  logger.debug({ baseKeyLength: validatedBaseKey.length }, 'Generating URL key');

  try {
    const key = createHash('sha1')
      .update(validatedBaseKey)
      .digest('base64')
      .slice(0, 16)
      .replaceAll(/[+/=]/g, '_')
      .replaceAll('/', '-');

    logger.debug({ keyLength: key.length }, 'Generated URL key');
    return key;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error('Unknown error'),
      'Failed to generate URL key',
    );
    throw new UrlKeyGenerationError(
      validatedBaseKey,
      error instanceof Error ? error.message : 'Unknown error',
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
 * @throws {InvalidUrlError} If URL is invalid or cannot be parsed
 * @throws {UrlNormalizationError} If URL normalization fails
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
export const parseUrlComponents = (url: unknown) => {
  logger.info({ urlType: typeof url }, 'Parsing URL components');

  let validatedUrl: string;

  if (process.env['NODE_ENV'] === 'development') {
    // Full Zod validation in development
    validatedUrl = urlInputSchema.parse(url);
  } else {
    // Lightweight validation in production
    if (typeof url !== 'string' || url.length === 0) {
      logger.error({ urlType: typeof url }, 'Invalid URL type');
      throw new InvalidUrlError(
        typeof url === 'string' ? url : String(url),
        'URL must be a non-empty string',
      );
    }

    // Native URL constructor validates format (fast, secure)
    try {
      const testUrl = new URL(url);

      // Block dangerous protocols
      if (testUrl.protocol !== 'http:' && testUrl.protocol !== 'https:') {
        logger.error({ protocol: testUrl.protocol }, 'Invalid protocol');
        throw new InvalidUrlError(
          url,
          `Invalid protocol: ${testUrl.protocol}. Only HTTP(S) protocols are allowed`,
        );
      }
    } catch (error) {
      // Re-throw if already an InvalidUrlError (from protocol check)
      if (error instanceof InvalidUrlError) {
        throw error;
      }

      logger.error(error instanceof Error ? error : new Error('Unknown error'), `URL validation failed: ${url}`);
      throw new InvalidUrlError(url);
    }

    validatedUrl = url;
  }

  try {
    logger.debug({ url: validatedUrl }, 'Normalizing URL');
    const normalized = normalizeUrl(validatedUrl, config.NORMALIZATION_RULES);
    const normalizedUrl = new URL(normalized);
    normalizedUrl.hostname = normalizedUrl.hostname.toLowerCase();
    const href = normalizedUrl.toString();
    const { hostname, pathname, search } = normalizedUrl;

    logger.debug(
      { originalUrl: validatedUrl, normalizedUrl: href },
      'URL normalized successfully',
    );

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
      const validated = urlComponentsSchema.parse(result);
      logger.info({ domain, key }, 'URL components parsed and validated');
      return validated;
    }

    logger.info({ domain, key }, 'URL components parsed successfully');
    return result as URLComponents;
  } catch (error) {
    // If error is already one of our custom errors, re-throw it
    if (
      error instanceof DomainParseError ||
      error instanceof UrlKeyGenerationError ||
      error instanceof InvalidUrlError
    ) {
      throw error;
    }

    logger.error(
      error instanceof Error ? error : new Error('Unknown error'),
      `Failed to parse URL components: ${validatedUrl}`,
    );
    throw new UrlNormalizationError(
      validatedUrl,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};
