/**
 * @fileoverview Store configuration management system that handles store identification,
 * domain mapping, and URL pattern matching for multi-store environments.
 */
import { storeConfigs } from './config';
import { createLogger } from './logger';
import type { StoreConfigInterface, StoreIdentifier } from './types';

const logger = createLogger('store-registry.registry');

/**
 * Builds a Map of store IDs to their configuration objects.
 * Optimized for cold start performance using pre-allocated arrays and imperative loops.
 * Avoids intermediate array allocations from flatMap/spread operators.
 *
 * @returns ReadonlyMap with store IDs (primary + aliases) as keys
 */
function buildStoreIdMap() {
  // Pre-calculate total size to avoid Map rehashing during construction
  let totalSize = 0;
  for (const config of storeConfigs) {
    totalSize += 1; // Primary ID
    totalSize += config.aliases?.length ?? 0; // Alias IDs
  }

  // Pre-allocate array with exact size - single allocation, no resizing
  const entries: Array<[string, StoreConfigInterface]> = new Array(totalSize);
  let index = 0;

  // Imperative loop - no intermediate arrays or spread operators
  for (const config of storeConfigs) {
    entries[index++] = [config.id, config];

    if (config.aliases) {
      for (const alias of config.aliases) {
        entries[index++] = [alias.id, config];
      }
    }
  }

  return new Map(entries);
}

/**
 * Builds a Map of domain names to their corresponding store IDs.
 * Optimized for cold start performance.
 *
 * @returns ReadonlyMap with domains (primary + aliases) as keys
 */
function buildStoreNameMap() {
  // Pre-calculate total size
  let totalSize = 0;
  for (const config of storeConfigs) {
    totalSize += 1; // Primary domain
    totalSize += config.aliases?.length ?? 0; // Alias domains
  }

  const entries: Array<[string, string]> = new Array(totalSize);
  let index = 0;

  for (const config of storeConfigs) {
    entries[index++] = [config.domain, config.id];

    if (config.aliases) {
      for (const alias of config.aliases) {
        entries[index++] = [alias.domain, alias.id];
      }
    }
  }

  return new Map(entries);
}

/**
 * Builds a Map of domains to their configuration objects for direct lookup.
 * Eliminates double Map access for domain-based lookups.
 * Optimized for high-performance scenarios (1000+ RPS).
 *
 * @returns ReadonlyMap with domains (primary + aliases) as keys
 */
function buildStoreDomainMap() {
  // Pre-calculate total size
  let totalSize = 0;
  for (const config of storeConfigs) {
    totalSize += 1; // Primary domain
    totalSize += config.aliases?.length ?? 0; // Alias domains
  }

  const entries: Array<[string, StoreConfigInterface]> = new Array(totalSize);
  let index = 0;

  for (const config of storeConfigs) {
    entries[index++] = [config.domain, config];

    if (config.aliases) {
      for (const alias of config.aliases) {
        entries[index++] = [alias.domain, config];
      }
    }
  }

  return new Map(entries);
}

/**
 * Builds a Map of store IDs to their pre-compiled pathname patterns.
 * Optimized for cold start performance.
 *
 * @returns ReadonlyMap with store IDs as keys and pattern arrays as values
 */
function buildCompiledPatternsMap() {
  // Pre-calculate size - only stores with patterns
  let totalSize = 0;
  for (const config of storeConfigs) {
    if (config.pathnamePatterns !== undefined) {
      totalSize += 1;
    }
  }

  const entries: Array<[string, ReadonlyArray<RegExp>]> = new Array(totalSize);
  let index = 0;

  for (const config of storeConfigs) {
    if (config.pathnamePatterns !== undefined) {
      entries[index++] = [config.id, config.pathnamePatterns];
    }
  }

  return new Map(entries);
}

/**
 * Map of store IDs to their complete configuration objects.
 * Includes both primary store configurations and their aliases.
 * Built once at module load for zero per-request overhead.
 * @constant
 */
export const STORE_ID_CONFIG: ReadonlyMap<string, StoreConfigInterface> = (() => {
  const startTime = performance.now();
  const map = buildStoreIdMap();
  const duration = performance.now() - startTime;
  logger.info(
    { storeCount: map.size, durationMs: duration.toFixed(2) },
    'Built STORE_ID_CONFIG map',
  );
  return map;
})();

/**
 * Map of domain names to their corresponding store IDs.
 * Includes both primary domains and alias domains.
 * Used internally by getStoreConfig for backward compatibility.
 * @constant
 * @deprecated Use STORE_DOMAIN_CONFIG for direct domain→config lookups
 */
export const STORE_NAME_CONFIG: ReadonlyMap<string, string> = (() => {
  const startTime = performance.now();
  const map = buildStoreNameMap();
  const duration = performance.now() - startTime;
  logger.info(
    { domainCount: map.size, durationMs: duration.toFixed(2) },
    'Built STORE_NAME_CONFIG map',
  );
  return map;
})();

/**
 * Map of domain names to their configuration objects.
 * Provides direct domain→config mapping for optimal performance.
 * Eliminates double Map access required by domain→ID→config pattern.
 * @constant
 */
export const STORE_DOMAIN_CONFIG: ReadonlyMap<string, StoreConfigInterface> = (() => {
  const startTime = performance.now();
  const map = buildStoreDomainMap();
  const duration = performance.now() - startTime;
  logger.info(
    { domainCount: map.size, durationMs: duration.toFixed(2) },
    'Built STORE_DOMAIN_CONFIG map',
  );
  return map;
})();

/**
 * Pre-compiled regular expressions for URL test cases pattern matching, indexed by store ID.
 * Improves performance by avoiding runtime compilation of patterns.
 * @constant
 */
export const COMPILED_PATTERNS: ReadonlyMap<string, ReadonlyArray<RegExp>> = (() => {
  const startTime = performance.now();
  const map = buildCompiledPatternsMap();
  const duration = performance.now() - startTime;
  logger.info(
    { patternCount: map.size, durationMs: duration.toFixed(2) },
    'Built COMPILED_PATTERNS map',
  );
  return map;
})();

/**
 * Retrieves store configuration based on either store ID or domain name.
 * Optimized for high-performance scenarios (1000+ RPS) with O(1) lookups.
 *
 * Performance characteristics:
 * - ID lookup: Single Map access (~5μs)
 * - Domain lookup: Single Map access (~5μs)
 * - Cold start: Optimized with pre-allocated arrays
 *
 * @param identifier - Object containing either a store ID or domain name
 * @returns The store configuration if found, undefined otherwise
 *
 * @example
 * // Lookup by ID (fastest)
 * const config1 = getStoreConfig({ id: '5246' });
 *
 * @example
 * // Lookup by domain (single Map access)
 * const config2 = getStoreConfig({ domain: 'target.com' });
 */
export const getStoreConfig = (identifier: StoreIdentifier) => {
  // Fast path for ID lookup - single Map access
  if (identifier.id !== undefined) {
    const config = STORE_ID_CONFIG.get(identifier.id);
    if (config === undefined) {
      logger.debug({ id: identifier.id }, 'Store not found by ID');
    }
    return config;
  }

  // Direct domain lookup - single Map access (optimized from previous double lookup)
  if (identifier.domain !== undefined) {
    const config = STORE_DOMAIN_CONFIG.get(identifier.domain);
    if (config === undefined) {
      logger.debug({ domain: identifier.domain }, 'Store not found by domain');
    }
    return config;
  }

  logger.debug({ identifier }, 'No ID or domain provided');
  return undefined;
};
