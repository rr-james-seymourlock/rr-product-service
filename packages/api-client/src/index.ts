/**
 * Rakuten Internal API Client
 *
 * A unified package for Rakuten's internal APIs.
 *
 * @example
 * ```ts
 * // Import CBSP client directly
 * import { getAllCatalogStoreIds, isCatalogStoreEnabled } from '@rr/api-client/cbsp';
 *
 * // Or import from main entry (re-exports all modules)
 * import { cbsp } from '@rr/api-client';
 * const storeIds = await cbsp.getAllCatalogStoreIds();
 * ```
 */

// Re-export CBSP module as namespace
export * as cbsp from './cbsp';
