/**
 * @fileoverview Store configuration management system that handles store identification,
 * domain mapping, and URL pattern matching for multi-store environments.
 */

import { storeConfigs } from './storeRegistry.config';
import type { StoreConfigInterface, StoreIdentifier, StoreAlias } from './storeRegistry.types';

/**
 * Map of store IDs to their complete configuration objects.
 * Includes both primary store configurations and their aliases.
 * @constant
 */
export const STORE_ID_CONFIG: ReadonlyMap<string, StoreConfigInterface> = new Map(
  storeConfigs.flatMap(
    (config): ReadonlyArray<[string, StoreConfigInterface]> => [
      [config.id, config] as [string, StoreConfigInterface],
      ...(config.aliases?.map(
        (alias: StoreAlias) => [alias.id, config] as [string, StoreConfigInterface],
      ) ?? []),
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
    ...(config.aliases?.map((alias: StoreAlias) => [alias.domain, alias.id] as const) ?? []),
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
    return storeId === undefined ? undefined : STORE_ID_CONFIG.get(storeId);
  }

  return undefined;
};
