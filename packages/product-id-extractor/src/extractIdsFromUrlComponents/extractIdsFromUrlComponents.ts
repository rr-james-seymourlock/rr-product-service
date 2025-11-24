import { getStoreConfig } from '@rr/store-registry';
import type { StoreConfigInterface } from '@rr/store-registry/types';

import { config } from './extractIdsFromUrlComponents.config';
import {
  type ExtractIdsInput,
  type ProductIds,
  extractIdsInputSchema,
  patternExtractorInputSchema,
  productIdsSchema,
} from './extractIdsFromUrlComponents.schema';

/**
 * Internal pattern extractor without validation overhead.
 * Used for internal calls where inputs are known to be valid.
 *
 * Performance optimizations:
 * - No Zod validation (saves ~1200-1800 validations/second at 300 RPS)
 * - Date.now() checked every 5 iterations (reduces syscalls by 80%)
 * - RegExp state reset in finally block (prevents state corruption)
 *
 * @internal
 */
const patternExtractorInternal = (source: string, pattern: RegExp): Set<string> => {
  const matches = new Set<string>();
  let match;
  let iterationCount = 0;
  const startTime = Date.now();
  const CHECK_INTERVAL = 5;

  try {
    while ((match = pattern.exec(source)) !== null) {
      // Check timeout every 5 iterations instead of every iteration
      if (++iterationCount % CHECK_INTERVAL === 0 && Date.now() - startTime >= config.TIMEOUT_MS) {
        if (process.env['NODE_ENV'] !== 'production') {
          console.warn(
            `Pattern extraction timed out after ${Date.now() - startTime}ms (source length: ${source.length})`,
          );
        }
        break;
      }

      if (match[1]) {
        matches.add(match[1].toLowerCase());
      }
      if (match[2]) {
        matches.add(match[2].toLowerCase());
      }

      if (matches.size >= config.MAX_RESULTS) {
        if (process.env['NODE_ENV'] === 'development') {
          console.warn(`Reached maximum results limit of ${config.MAX_RESULTS}`);
        }
        break;
      }
    }
  } catch (error) {
    if (process.env['NODE_ENV'] !== 'production') {
      console.error(
        `Error extracting patterns (source length: ${source.length}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  } finally {
    // Always reset regex state to prevent issues on next call
    pattern.lastIndex = 0;
  }

  return matches;
};

const addPatternMatches = ({
  source,
  patterns,
  results,
  transform,
}: {
  source: string;
  patterns: ReadonlyArray<RegExp> | undefined;
  results: Set<string>;
  transform?: StoreConfigInterface['transformId'];
}): void => {
  if (!source || patterns === undefined) {
    return;
  }

  for (const pattern of patterns) {
    if (results.size >= config.MAX_RESULTS) {
      return;
    }

    for (const id of patternExtractorInternal(source, pattern)) {
      results.add(transform ? transform(id) : id);

      if (results.size >= config.MAX_RESULTS) {
        return;
      }
    }
  }
};

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

  return patternExtractorInternal(source, pattern);
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
 * Performance:
 * - Development: Full Zod validation (catch integration bugs)
 * - Production: No validation (trust upstream parseUrlComponents)
 *
 * Extraction order:
 * 1. Domain-specific pathname patterns (with optional transformId)
 * 2. Generic pathname patterns (if no domain-specific matches)
 * 3. Domain-specific search patterns
 * 4. Generic search patterns
 *
 * @param input - Object containing URL components and optional store ID
 * @returns Frozen, sorted array of product IDs (max 12)
 *
 * @throws {ZodError} If input or output validation fails (development only)
 *
 * @example
 * ```typescript
 * const urlComponents = parseUrlComponents('https://nike.com/product/abc-123');
 * const ids = extractIdsFromUrlComponents({ urlComponents });
 * // Returns: ['abc-123'] (frozen array)
 * ```
 */
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  // Validate in development to catch integration bugs
  if (process.env['NODE_ENV'] === 'development') {
    extractIdsInputSchema.parse(input);
  }

  // Production trusts upstream validation (already validated by parseUrlComponents)
  const { urlComponents, storeId } = input;

  const { domain, pathname, search, href } = urlComponents;
  const normalizedPathname = pathname ? pathname.toLowerCase() : '';
  const normalizedSearch = search ? search.toLowerCase() : '';
  const results = new Set<string>();

  try {
    const domainConfig = getStoreConfig(storeId ? { domain, id: storeId } : { domain });

    // Check domain-specific path patterns first
    addPatternMatches({
      source: normalizedPathname,
      patterns: domainConfig?.pathnamePatterns,
      results,
      transform: domainConfig?.transformId,
    });

    // Only run pathname patterns if no domain-specific pathname id's were found
    if (results.size === 0 && normalizedPathname) {
      addPatternMatches({
        source: normalizedPathname,
        patterns: config.PATTERNS.pathnamePatterns,
        results,
      });
    }

    if (normalizedSearch && results.size < config.MAX_RESULTS) {
      addPatternMatches({
        source: normalizedSearch,
        patterns: domainConfig?.searchPatterns,
        results,
      });
    }

    if (normalizedSearch && results.size < config.MAX_RESULTS) {
      addPatternMatches({
        source: normalizedSearch,
        patterns: [config.PATTERNS.searchPattern],
        results,
      });
    }
  } catch (error) {
    if (process.env['NODE_ENV'] !== 'production') {
      console.error(
        `Error processing URL (length: ${href.length}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  const sortedResults = [...results].sort();
  const validatedResults = productIdsSchema.parse(sortedResults);
  return Object.freeze(validatedResults) as ProductIds;
};
