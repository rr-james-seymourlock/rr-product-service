/**
 * CBSP Store List API Client
 *
 * Provides access to Rakuten's product catalog-enabled store IDs.
 *
 * @example
 * ```ts
 * import { getAllCatalogStoreIds, isCatalogStoreEnabled } from '@rr/api-client/cbsp';
 *
 * // Get all enabled store IDs
 * const storeIds = await getAllCatalogStoreIds();
 *
 * // Check if a specific store is enabled
 * if (await isCatalogStoreEnabled(5246)) {
 *   console.log('Target is enabled');
 * }
 * ```
 */
export {
  // Configuration
  configure,
  clearCache,
  getCacheStatus,
  type CbspClientConfig,
  // All stores
  getAllStoreIds,
  getAllStores,
  getAllStoresWithStatus,
  getStoreName,
  type StoreWithStatus,
  // Catalog stores (productSearchEnabled=true)
  getAllCatalogStoreIds,
  getAllCatalogStores,
  getCatalogStoreName,
  isCatalogStoreEnabled,
} from './client';

export {
  cbspStoreListResponseSchema,
  storeAttributesSchema,
  type CbspStoreListResponse,
  type StoreAttributes,
  type StoreEntry,
} from './schema';
