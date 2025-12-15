import { createLogger } from '@rr/shared/utils';

import { cbspStoreListResponseSchema } from './schema';

const logger = createLogger('api-client.cbsp');

/**
 * Configuration options for the CBSP client
 */
export interface CbspClientConfig {
  /**
   * Base URL for the CBSP API
   * @default 'https://cbsp-prod1.prod.rakutenrewards-it.com'
   */
  baseUrl?: string;

  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  cacheTtlMs?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<CbspClientConfig> = {
  baseUrl: 'https://cbsp-prod1.prod.rakutenrewards-it.com',
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Cache entry for store IDs and names
 */
interface CacheEntry {
  storeIds: Set<number>;
  sortedIds: number[];
  storeNames: Map<number, string>;
  fetchedAt: number;
}

/**
 * In-memory cache for store IDs
 */
let cache: CacheEntry | null = null;

/**
 * Current configuration (can be updated via configure())
 */
let config: Required<CbspClientConfig> = { ...DEFAULT_CONFIG };

/**
 * Configure the CBSP client
 *
 * @example
 * ```ts
 * configure({
 *   baseUrl: 'https://cbsp-staging.example.com',
 *   cacheTtlMs: 60000, // 1 minute
 * });
 * ```
 */
export function configure(options: CbspClientConfig): void {
  config = { ...DEFAULT_CONFIG, ...options };
  logger.info({ config }, 'CBSP client configured');
}

/**
 * Clear the cache, forcing a fresh fetch on next request
 */
export function clearCache(): void {
  cache = null;
  logger.debug('CBSP cache cleared');
}

/**
 * Check if the cache is still valid
 */
function isCacheValid(): boolean {
  if (!cache) return false;
  const age = Date.now() - cache.fetchedAt;
  return age < config.cacheTtlMs;
}

/**
 * Fetch store data from the CBSP API
 */
async function fetchStoreData(): Promise<CacheEntry> {
  const url = `${config.baseUrl}/cbsp/partner/1/store/list.json?fields=id,name&productSearchEnabled=true&rows=100000`;

  logger.debug({ url }, 'Fetching catalog stores from CBSP');

  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`CBSP API error: ${response.status} ${response.statusText}`);
    logger.error(
      { status: response.status, statusText: response.statusText },
      'CBSP API request failed',
    );
    throw error;
  }

  const data: unknown = await response.json();
  const parsed = cbspStoreListResponseSchema.parse(data);

  const storeIds = new Set(parsed.store.map((s) => s.id));
  const sortedIds = [...storeIds].sort((a, b) => a - b);
  const storeNames = new Map(parsed.store.map((s) => [s.id, s.name]));

  logger.info(
    { storeCount: storeIds.size, rows: parsed['@rows'], total: parsed['@total'] },
    'Fetched catalog stores from CBSP',
  );

  return {
    storeIds,
    sortedIds,
    storeNames,
    fetchedAt: Date.now(),
  };
}

/**
 * Ensure cache is populated, fetching if necessary
 */
async function ensureCache(): Promise<CacheEntry> {
  if (isCacheValid() && cache) {
    return cache;
  }

  cache = await fetchStoreData();
  return cache;
}

/**
 * Get all product catalog-enabled store IDs
 *
 * Returns a sorted array of store IDs that are enabled for product catalog.
 * Results are cached to minimize API calls.
 *
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Sorted array of store IDs
 *
 * @example
 * ```ts
 * const storeIds = await getAllCatalogStoreIds();
 * console.log(`Found ${storeIds.length} catalog-enabled stores`);
 * ```
 */
export async function getAllCatalogStoreIds(options?: {
  forceRefresh?: boolean;
}): Promise<number[]> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  return entry.sortedIds;
}

/**
 * Check if a store ID is enabled for product catalog
 *
 * Performs O(1) lookup after initial fetch. Results are cached.
 *
 * @param storeId - Store ID to check (string or number)
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns true if the store is enabled for product catalog
 *
 * @example
 * ```ts
 * if (await isCatalogStoreEnabled(5246)) {
 *   console.log('Target is enabled for product catalog');
 * }
 * ```
 */
export async function isCatalogStoreEnabled(
  storeId: string | number,
  options?: { forceRefresh?: boolean },
): Promise<boolean> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  const numericId = typeof storeId === 'string' ? parseInt(storeId, 10) : storeId;

  if (isNaN(numericId)) {
    logger.warn({ storeId }, 'Invalid store ID provided');
    return false;
  }

  return entry.storeIds.has(numericId);
}

/**
 * Get the name of a catalog-enabled store by ID
 *
 * Performs O(1) lookup after initial fetch. Results are cached.
 *
 * @param storeId - Store ID to look up (string or number)
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Store name or undefined if not found
 *
 * @example
 * ```ts
 * const name = await getCatalogStoreName(5246);
 * console.log(name); // "Target"
 * ```
 */
export async function getCatalogStoreName(
  storeId: string | number,
  options?: { forceRefresh?: boolean },
): Promise<string | undefined> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  const numericId = typeof storeId === 'string' ? parseInt(storeId, 10) : storeId;

  if (isNaN(numericId)) {
    logger.warn({ storeId }, 'Invalid store ID provided');
    return undefined;
  }

  return entry.storeNames.get(numericId);
}

/**
 * Get all catalog-enabled stores with their IDs and names
 *
 * Returns an array of store objects sorted by ID.
 * Results are cached to minimize API calls.
 *
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Array of store objects with id and name
 *
 * @example
 * ```ts
 * const stores = await getAllCatalogStores();
 * stores.forEach(store => console.log(`${store.id}: ${store.name}`));
 * ```
 */
export async function getAllCatalogStores(options?: {
  forceRefresh?: boolean;
}): Promise<Array<{ id: number; name: string }>> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  return entry.sortedIds.map((id) => ({
    id,
    name: entry.storeNames.get(id) ?? '',
  }));
}

/**
 * Get the current cache status (useful for debugging)
 */
export function getCacheStatus(): {
  isCached: boolean;
  storeCount: number;
  cacheAge: number | null;
  ttlRemaining: number | null;
} {
  if (!cache) {
    return { isCached: false, storeCount: 0, cacheAge: null, ttlRemaining: null };
  }

  const cacheAge = Date.now() - cache.fetchedAt;
  const ttlRemaining = Math.max(0, config.cacheTtlMs - cacheAge);

  return {
    isCached: true,
    storeCount: cache.storeIds.size,
    cacheAge,
    ttlRemaining,
  };
}
