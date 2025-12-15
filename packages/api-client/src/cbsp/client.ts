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
 * Cache entry for store data
 */
interface CacheEntry {
  /** All store IDs */
  allStoreIds: Set<number>;
  /** All store IDs sorted */
  allSortedIds: number[];
  /** Store IDs with productSearchEnabled=true */
  catalogStoreIds: Set<number>;
  /** Catalog store IDs sorted */
  catalogSortedIds: number[];
  /** Store ID to name mapping (all stores) */
  storeNames: Map<number, string>;
  /** When the cache was populated */
  fetchedAt: number;
}

/**
 * In-memory cache for store data
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
  const url = `${config.baseUrl}/cbsp/partner/1/store/list.json?fields=id,name,attributes&rows=100000`;

  logger.debug({ url }, 'Fetching stores from CBSP');

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

  // Build all stores data
  const allStoreIds = new Set(parsed.store.map((s) => s.id));
  const allSortedIds = [...allStoreIds].sort((a, b) => a - b);
  const storeNames = new Map(parsed.store.map((s) => [s.id, s.name]));

  // Build catalog-enabled stores data (productSearchEnabled=true)
  const catalogStores = parsed.store.filter((s) => s.attributes.productSearchEnabled);
  const catalogStoreIds = new Set(catalogStores.map((s) => s.id));
  const catalogSortedIds = [...catalogStoreIds].sort((a, b) => a - b);

  logger.info(
    {
      totalStores: allStoreIds.size,
      catalogStores: catalogStoreIds.size,
      rows: parsed['@rows'],
      total: parsed['@total'],
    },
    'Fetched stores from CBSP',
  );

  return {
    allStoreIds,
    allSortedIds,
    catalogStoreIds,
    catalogSortedIds,
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

// ============================================================================
// ALL STORES (regardless of productSearchEnabled)
// ============================================================================

/**
 * Get all store IDs
 *
 * Returns a sorted array of ALL store IDs (regardless of catalog status).
 * Results are cached to minimize API calls.
 *
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Sorted array of all store IDs
 *
 * @example
 * ```ts
 * const storeIds = await getAllStoreIds();
 * console.log(`Found ${storeIds.length} total stores`);
 * ```
 */
export async function getAllStoreIds(options?: { forceRefresh?: boolean }): Promise<number[]> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  return entry.allSortedIds;
}

/**
 * Get all stores with their IDs and names
 *
 * Returns an array of ALL store objects sorted by ID.
 * Results are cached to minimize API calls.
 *
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Array of store objects with id and name
 *
 * @example
 * ```ts
 * const stores = await getAllStores();
 * stores.forEach(store => console.log(`${store.id}: ${store.name}`));
 * ```
 */
export async function getAllStores(options?: {
  forceRefresh?: boolean;
}): Promise<Array<{ id: number; name: string }>> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  return entry.allSortedIds.map((id) => ({
    id,
    name: entry.storeNames.get(id) ?? '',
  }));
}

/**
 * Store data with catalog status
 */
export interface StoreWithStatus {
  id: number;
  name: string;
  productSearchEnabled: boolean;
}

/**
 * Get all stores with their IDs, names, and productSearchEnabled status
 *
 * Returns a flattened array of ALL store objects sorted by ID.
 * Useful for generating local JSON fixtures for testing.
 * Results are cached to minimize API calls.
 *
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Array of store objects with id, name, and productSearchEnabled
 *
 * @example
 * ```ts
 * // Generate stores.json fixture
 * const stores = await getAllStoresWithStatus();
 * writeFileSync('stores.json', JSON.stringify(stores, null, 2));
 * ```
 */
export async function getAllStoresWithStatus(options?: {
  forceRefresh?: boolean;
}): Promise<StoreWithStatus[]> {
  if (options?.forceRefresh) {
    clearCache();
  }

  const entry = await ensureCache();
  return entry.allSortedIds.map((id) => ({
    id,
    name: entry.storeNames.get(id) ?? '',
    productSearchEnabled: entry.catalogStoreIds.has(id),
  }));
}

/**
 * Get the name of any store by ID
 *
 * Performs O(1) lookup after initial fetch. Results are cached.
 *
 * @param storeId - Store ID to look up (string or number)
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Store name or undefined if not found
 *
 * @example
 * ```ts
 * const name = await getStoreName(5246);
 * console.log(name); // "Target"
 * ```
 */
export async function getStoreName(
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

// ============================================================================
// CATALOG STORES (productSearchEnabled=true only)
// ============================================================================

/**
 * Get all product catalog-enabled store IDs
 *
 * Returns a sorted array of store IDs that have productSearchEnabled=true.
 * Results are cached to minimize API calls.
 *
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Sorted array of catalog-enabled store IDs
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
  return entry.catalogSortedIds;
}

/**
 * Get all catalog-enabled stores with their IDs and names
 *
 * Returns an array of store objects (productSearchEnabled=true) sorted by ID.
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
  return entry.catalogSortedIds.map((id) => ({
    id,
    name: entry.storeNames.get(id) ?? '',
  }));
}

/**
 * Check if a store ID is enabled for product catalog
 *
 * Performs O(1) lookup after initial fetch. Results are cached.
 *
 * @param storeId - Store ID to check (string or number)
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns true if the store has productSearchEnabled=true
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

  return entry.catalogStoreIds.has(numericId);
}

/**
 * Get the name of a catalog-enabled store by ID
 *
 * Performs O(1) lookup after initial fetch. Results are cached.
 * Returns undefined if the store exists but is not catalog-enabled.
 *
 * @param storeId - Store ID to look up (string or number)
 * @param options.forceRefresh - Force a fresh fetch, bypassing cache
 * @returns Store name or undefined if not found or not catalog-enabled
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

  // Only return name if store is catalog-enabled
  if (!entry.catalogStoreIds.has(numericId)) {
    return undefined;
  }

  return entry.storeNames.get(numericId);
}

// ============================================================================
// CACHE STATUS
// ============================================================================

/**
 * Get the current cache status (useful for debugging)
 */
export function getCacheStatus(): {
  isCached: boolean;
  totalStoreCount: number;
  catalogStoreCount: number;
  cacheAge: number | null;
  ttlRemaining: number | null;
} {
  if (!cache) {
    return {
      isCached: false,
      totalStoreCount: 0,
      catalogStoreCount: 0,
      cacheAge: null,
      ttlRemaining: null,
    };
  }

  const cacheAge = Date.now() - cache.fetchedAt;
  const ttlRemaining = Math.max(0, config.cacheTtlMs - cacheAge);

  return {
    isCached: true,
    totalStoreCount: cache.allStoreIds.size,
    catalogStoreCount: cache.catalogStoreIds.size,
    cacheAge,
    ttlRemaining,
  };
}
