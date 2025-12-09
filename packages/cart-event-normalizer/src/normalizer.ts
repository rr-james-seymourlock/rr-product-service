import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { coerceStoreId } from '@rr/shared/utils';
import { parseUrlComponents } from '@rr/url-parser';

import type { CartProduct, NormalizeCartEventOptions, RawCartEvent, RawProduct } from './types.js';
import { RawCartEventSchema } from './types.js';

/**
 * Check if a product has enough data to be useful
 * A product is valid if it has:
 * - A URL (regardless of other fields), OR
 * - Both a name AND a price (when URL is missing)
 */
function isValidProduct(product: RawProduct): boolean {
  const hasUrl = product.url !== undefined && product.url.trim() !== '';
  if (hasUrl) {
    return true;
  }

  // Without URL, require both name AND price
  const hasName = product.name !== undefined && product.name.trim() !== '';
  const hasPrice = product.item_price !== undefined;
  return hasName && hasPrice;
}

/**
 * Extract product IDs from a URL using the product-id-extractor
 */
function extractProductIds(
  url: string | undefined,
  storeId: string | undefined,
): readonly string[] {
  if (!url) {
    return Object.freeze([]);
  }

  try {
    const urlComponents = parseUrlComponents(url);
    const result = extractIdsFromUrlComponents({
      urlComponents,
      storeId,
    });
    return result.productIds;
  } catch {
    // URL parsing or extraction failed - return empty array
    return Object.freeze([]);
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
  const productIds = extractIds ? extractProductIds(product.url, storeId) : Object.freeze([]);

  const normalized: CartProduct = {
    productIds,
  };

  // Only include fields that have values
  if (product.name !== undefined && product.name.trim() !== '') {
    normalized.title = product.name;
  }

  if (product.url !== undefined && product.url.trim() !== '') {
    normalized.url = product.url;
  }

  if (product.image_url !== undefined && product.image_url.trim() !== '') {
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
 * Uses URL if available, otherwise falls back to productIds joined
 */
function getDeduplicationKey(product: CartProduct): string | undefined {
  // Prefer URL as the deduplication key
  if (product.url) {
    return product.url;
  }

  // Fall back to productIds if no URL
  if (product.productIds.length > 0) {
    return product.productIds.join('|');
  }

  // No deduplication possible without URL or productIds
  return undefined;
}

/**
 * Deduplicate products, keeping the first occurrence
 * Products without a deduplication key (no URL, no productIds) are always kept
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
 * // [{ title: "Product", url: "...", storeId: "8333", price: 4200, productIds: ["123"] }]
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

  // Filter and normalize products
  const normalizedProducts = productList
    .filter(isValidProduct)
    .map((product) => normalizeProduct(product, storeId, extractIds));

  // Deduplicate products by URL (or productIds if no URL)
  const deduplicatedProducts = deduplicateProducts(normalizedProducts);

  return Object.freeze(deduplicatedProducts);
}
