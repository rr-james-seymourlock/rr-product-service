/**
 * @fileoverview Store configuration management system that handles store identification,
 * domain mapping, and URL pattern matching for multi-store environments.
 */

import { storeConfigs } from './configs';

export interface StoreConfigInterface {
  readonly id: string;
  readonly domain: string;
  /** Optional list of alternative domains and IDs that map to this store */
  readonly aliases?: ReadonlyArray<{
    readonly id: string;
    readonly domain: string;
  }>;
  /** Optional examples of ID structures, not used in system but potential future for Levenshtein Distance comparisons */
  readonly patternFormats?: string[];
  /** Optional list of regular expressions for URL pattern matching */
  readonly pathnamePatterns?: RegExp[];
  readonly searchPatterns?: RegExp[];
  /**
   * Optional transform function to modify the captured ID
   * @param id The ID to transform
   */
  // eslint-disable-next-line
  readonly transformId?: (id: string) => string;
}

interface StoreIdentifier {
  domain?: string;
  id?: string;
}

/**
 * Map of store IDs to their complete configuration objects.
 * Includes both primary store configurations and their aliases.
 * @constant
 */
export const STORE_ID_CONFIG: ReadonlyMap<string, StoreConfigInterface> = new Map(
  storeConfigs.flatMap(
    (config): ReadonlyArray<[string, StoreConfigInterface]> => [
      [config.id, config] as [string, StoreConfigInterface],
      ...(config.aliases?.map((alias) => [alias.id, config] as [string, StoreConfigInterface]) ??
        []),
    ],
  ),
);

/**
 * Map of domain names to their corresponding store IDs.
 * Includes both primary domains and alias domains.
 * @constant
 */
export const STORE_NAME_CONFIG: ReadonlyMap<string, string> = new Map(
  storeConfigs.flatMap((config) => [
    [config.domain, config.id] as const,
    ...(config.aliases?.map((alias) => [alias.domain, alias.id] as const) ?? []),
  ]),
);

/**
 * Pre-compiled regular expressions for URL test cases pattern matching, indexed by store ID.
 * Improves performance by avoiding runtime compilation of patterns.
 * @constant
 */
export const COMPILED_PATTERNS: ReadonlyMap<string, ReadonlyArray<RegExp>> = new Map(
  storeConfigs
    .filter((config) => config.pathnamePatterns !== undefined)
    .map((config) => [config.id, config.pathnamePatterns] as [string, ReadonlyArray<RegExp>]),
);

/**
 * Retrieves store configuration based on either store ID or domain name.
 * Optimized for performance with a fast-path for ID lookups.
 *
 * @param identifier - Object containing either a store ID or domain name
 * @returns The store configuration if found, undefined otherwise
 *
 * @example
 * // Lookup by ID
 * const config1 = getStoreConfig({ id: '123' });
 *
 * @example
 * // Lookup by domain
 * const config2 = getStoreConfig({ domain: 'example.com' });
 */
export const getStoreConfig = (identifier: StoreIdentifier): StoreConfigInterface | undefined => {
  // Fast path for ID lookup
  if (identifier.id !== undefined) {
    return STORE_ID_CONFIG.get(identifier.id);
  }

  // Domain lookup with single Map access
  if (identifier.domain !== undefined) {
    const storeId = STORE_NAME_CONFIG.get(identifier.domain);
    return storeId !== undefined ? STORE_ID_CONFIG.get(storeId) : undefined;
  }

  return undefined;
};
