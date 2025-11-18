import { config } from './extractIdsFromUrlComponents.config';
import {
  patternExtractorInputSchema,
  extractIdsInputSchema,
  productIdsSchema,
  type ProductIds,
} from './extractIdsFromUrlComponents.schema';
import { getStoreConfig } from '@/storeConfigs';

/**
 * Extracts product IDs from a source string using a regular expression pattern.
 *
 * Features:
 * - Timeout protection (100ms maximum)
 * - Result limiting (12 IDs maximum)
 * - Safe regex validation in development mode
 * - Captures up to 2 groups per match
 *
 * @param input - Object containing source string and RegExp pattern (validated at runtime)
 * @returns Set of extracted product IDs
 *
 * @throws {ZodError} If input validation fails
 *
 * @example
 * ```typescript
 * const ids = patternExtractor({
 *   source: '/product/p123456789',
 *   pattern: /p(\d{6,})/g
 * });
 * // Returns: Set(['p123456789', '123456789'])
 * ```
 */
export const patternExtractor = (input: unknown): Set<string> => {
  // Validate input - throws ZodError if invalid
  const { source, pattern } = patternExtractorInputSchema.parse(input);
  if (process.env['NODE_ENV'] === 'development') {
    if (!(pattern instanceof RegExp)) {
      console.warn('Invalid input: pattern must be a RegExp object. Returning empty set.');
      return new Set();
    }
    if (!pattern.global) {
      console.warn(`RegExp pattern '${pattern}' must have global flag (/g). Returning empty set.`);
      return new Set();
    }
  }

  const matches = new Set<string>();
  let match;
  const startTime = Date.now();

  try {
    while ((match = pattern.exec(source)) !== null) {
      if (Date.now() - startTime >= config.TIMEOUT_MS) {
        console.warn(
          `Pattern extraction timed out after ${Date.now() - startTime}ms for source: ${source}`,
        );
        break;
      }

      if (match[1]) {
        matches.add(match[1]);
      }
      if (match[2]) {
        matches.add(match[2]);
      }

      if (matches.size >= config.MAX_RESULTS) {
        if (process.env['NODE_ENV'] === 'development') {
          console.warn(`Reached maximum results limit of ${config.MAX_RESULTS}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error(
      `Error extracting patterns from source "${source}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return matches;
};

/**
 * Extracts product IDs from URL components using pattern matching.
 *
 * Features:
 * - Domain-specific pattern extraction with priority
 * - Store-specific ID transformation support
 * - Fallback to generic patterns
 * - Query parameter extraction
 * - Safe error handling
 *
 * Extraction order:
 * 1. Domain-specific pathname patterns (with optional transformId)
 * 2. Generic pathname patterns (if no domain-specific matches)
 * 3. Domain-specific search patterns
 * 4. Generic search patterns
 *
 * @param input - Object containing URL components and optional store ID (validated at runtime)
 * @returns Frozen, sorted array of product IDs (max 12)
 *
 * @throws {ZodError} If input or output validation fails
 *
 * @example
 * ```typescript
 * const urlComponents = parseUrlComponents('https://nike.com/product/abc-123');
 * const ids = extractIdsFromUrlComponents({ urlComponents });
 * // Returns: ['abc-123'] (frozen array)
 * ```
 */
export const extractIdsFromUrlComponents = (input: unknown): ProductIds => {
  // Validate input - throws ZodError if invalid
  const { urlComponents, storeId } = extractIdsInputSchema.parse(input);

  const { domain, pathname, search, href } = urlComponents;
  const results = new Set<string>();

  try {
    const domainConfig = getStoreConfig(storeId ? { domain, id: storeId } : { domain });

    // Check domain-specific path patterns first
    if (domainConfig?.pathnamePatterns && pathname) {
      for (const pattern of domainConfig.pathnamePatterns) {
        for (const id of patternExtractor({ source: pathname, pattern })) {
          // Apply transform function if it exists, otherwise use the original ID
          const transformedId = domainConfig.transformId ? domainConfig.transformId(id) : id;
          results.add(transformedId);
        }
      }
    }

    // Only run pathname patterns if no domain-specific pathname id's were found
    if (results.size === 0 && pathname) {
      // Iterate through all pathname patterns
      for (const pattern of config.PATTERNS.pathnamePatterns) {
        for (const id of patternExtractor({ source: pathname, pattern })) {
          results.add(id);
        }
      }
    }

    // Check domain-specific search patterns first
    if (domainConfig?.searchPatterns && search) {
      for (const pattern of domainConfig.searchPatterns) {
        for (const id of patternExtractor({ source: search, pattern })) {
          results.add(id);
        }
      }
    }

    // Only run query patterns if URL contains query parameters
    if (search) {
      for (const id of patternExtractor({
        source: search,
        pattern: config.PATTERNS.searchPattern,
      })) {
        results.add(id);
      }
    }
  } catch (error) {
    console.error(
      `Error processing URL ${href}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  const sortedResults = Object.freeze([...results].sort());

  // Validate output - ensures internal correctness
  return productIdsSchema.parse(sortedResults);
};
