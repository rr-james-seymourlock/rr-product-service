import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { coerceStoreId, createLogger } from '@rr/shared/utils';
import { parseUrlComponents } from '@rr/url-parser';

import type { CartProduct, NormalizeCartEventOptions, RawCartEvent, RawProduct } from './types.js';
import { RawCartEventSchema } from './types.js';

const logger = createLogger('cart-event-normalizer');

// Pre-frozen empty array constants to avoid repeated Object.freeze([]) calls
const EMPTY_FROZEN_STRING_ARRAY: readonly string[] = Object.freeze([]);
const EMPTY_FROZEN_PRODUCT_ARRAY: readonly CartProduct[] = Object.freeze([]);

/**
 * Helper to check if a string is non-empty
 */
function isNonEmptyString(s: string | undefined): s is string {
  return s !== undefined && s.trim() !== '';
}

/**
 * Check if a product has enough data to be useful
 * A product is valid if it has:
 * - A URL (regardless of other fields), OR
 * - Both a name AND a price (when URL is missing)
 */
function isValidProduct(product: RawProduct): boolean {
  if (isNonEmptyString(product.url)) {
    return true;
  }

  // Without URL, require both name AND price
  const hasName = isNonEmptyString(product.name);
  const hasPrice = product.item_price !== undefined;
  return hasName && hasPrice;
}

/**
 * Extract product IDs from a URL using the product-id-extractor
 */
function extractProductIdsFromUrl(
  url: string | undefined,
  storeId: string | undefined,
): readonly string[] {
  if (!url) {
    return EMPTY_FROZEN_STRING_ARRAY;
  }

  try {
    const urlComponents = parseUrlComponents(url);
    const result = extractIdsFromUrlComponents({
      urlComponents,
      storeId,
    });
    return result.productIds;
  } catch (error) {
    // Log extraction failures for observability at scale
    logger.debug(
      { url, storeId, error: error instanceof Error ? error.message : String(error) },
      'URL parsing or extraction failed',
    );
    return EMPTY_FROZEN_STRING_ARRAY;
  }
}

/**
 * Normalize a single raw product to CartProduct format
 */
function normalizeProduct(
  product: RawProduct,
  storeId: string | undefined,
  extractIds: boolean,
): CartProduct {
  // Cart events don't have schema.org data, so productIds is always empty
  // URL-extracted IDs go in extractedIds
  const extractedIds = extractIds
    ? extractProductIdsFromUrl(product.url, storeId)
    : EMPTY_FROZEN_STRING_ARRAY;

  // Build the ids object - cart events only have extractedIds (no schema.org data)
  const ids: CartProduct['ids'] = Object.freeze({
    productIds: EMPTY_FROZEN_STRING_ARRAY,
    extractedIds,
  });

  const normalized: CartProduct = {
    ids,
  };

  // Only include fields that have values
  if (isNonEmptyString(product.name)) {
    normalized.title = product.name;
  }

  if (isNonEmptyString(product.url)) {
    normalized.url = product.url;
  }

  if (isNonEmptyString(product.image_url)) {
    normalized.imageUrl = product.image_url;
  }

  if (storeId !== undefined) {
    normalized.storeId = storeId;
  }

  if (product.item_price !== undefined) {
    normalized.price = product.item_price;
  }

  if (product.quantity !== undefined) {
    normalized.quantity = product.quantity;
  }

  if (product.line_total !== undefined) {
    normalized.lineTotal = product.line_total;
  }

  return Object.freeze(normalized);
}

/**
 * Generate a deduplication key for a product
 * Uses URL if available, otherwise falls back to extractedIds joined
 */
function getDeduplicationKey(product: CartProduct): string | undefined {
  // Prefer URL as the deduplication key
  if (product.url) {
    return product.url;
  }

  // Fall back to extractedIds if no URL
  if (product.ids.extractedIds.length > 0) {
    return product.ids.extractedIds.join('|');
  }

  // No deduplication possible without URL or extractedIds
  return undefined;
}

/**
 * Deduplicate products, keeping the first occurrence
 * Products without a deduplication key (no URL, no extractedIds) are always kept
 */
function deduplicateProducts(products: CartProduct[]): CartProduct[] {
  const seen = new Set<string>();
  const result: CartProduct[] = [];

  for (const product of products) {
    const key = getDeduplicationKey(product);

    if (key === undefined) {
      // No key means we can't deduplicate - keep the product
      result.push(product);
    } else if (!seen.has(key)) {
      seen.add(key);
      result.push(product);
    }
    // If key is already seen, skip this duplicate
  }

  return result;
}

/**
 * Normalize a raw cart event into a clean array of CartProduct objects
 *
 * @param event - Raw cart event from apps/extensions
 * @param options - Normalization options
 * @returns Frozen array of normalized CartProduct objects (deduplicated by URL)
 *
 * @example
 * ```ts
 * const products = normalizeCartEvent(rawEvent);
 * // [{ title: "Product", url: "...", storeId: "8333", price: 4200, productIds: [], extractedIds: ["123"] }]
 * ```
 */
export function normalizeCartEvent(
  event: RawCartEvent,
  options: NormalizeCartEventOptions = {},
): readonly CartProduct[] {
  const { validate = false, extractProductIds: extractIds = true } = options;

  // Validate input if requested
  if (validate) {
    RawCartEventSchema.parse(event);
  }

  // Coerce store_id to string
  const storeId = coerceStoreId(event.store_id);

  // Get product list (default to empty array)
  const productList = event.product_list ?? [];

  // Early return for empty product list
  if (productList.length === 0) {
    return EMPTY_FROZEN_PRODUCT_ARRAY;
  }

  // Filter and normalize products
  const normalizedProducts = productList
    .filter(isValidProduct)
    .map((product) => normalizeProduct(product, storeId, extractIds));

  // Early return if all products were filtered out
  if (normalizedProducts.length === 0) {
    return EMPTY_FROZEN_PRODUCT_ARRAY;
  }

  // Deduplicate products by URL (or productIds if no URL)
  const deduplicatedProducts = deduplicateProducts(normalizedProducts);

  return Object.freeze(deduplicatedProducts);
}
