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
  configure,
  clearCache,
  getAllCatalogStoreIds,
  isCatalogStoreEnabled,
  getCacheStatus,
  type CbspClientConfig,
} from './client';

export { cbspStoreListResponseSchema, type CbspStoreListResponse, type StoreEntry } from './schema';
