/**
 * @fileoverview Type definitions for store registry system.
 * Central location for all type definitions used across storeRegistry.
 */

/**
 * Store alias configuration.
 * Represents alternative domains and IDs that map to a primary store.
 */
export interface StoreAlias {
  readonly id: string;
  readonly domain: string;
}

/**
 * Complete store configuration interface.
 * Defines the structure of store configuration objects including patterns and aliases.
 */
export interface StoreConfigInterface {
  readonly id: string;
  readonly domain: string;
  /** Optional list of alternative domains and IDs that map to this store */
  readonly aliases?: ReadonlyArray<StoreAlias>;
  /** Optional examples of ID structures, not used in system but potential future for Levenshtein Distance comparisons */
  readonly patternFormats?: string[];
  /** Optional list of regular expressions for URL pattern matching */
  readonly pathnamePatterns?: RegExp[];
  readonly searchPatterns?: RegExp[];
  /**
   * Optional transform function to modify the captured ID
   * @param id The ID to transform
   */
  readonly transformId?: (id: string) => string;
}

/**
 * Store identifier for lookup operations.
 * Used by getStoreConfig to specify which store to retrieve.
 * At least one of domain or id should be provided.
 */
export interface StoreIdentifier {
  domain?: string;
  id?: string;
}
