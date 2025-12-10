import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { coerceStoreId, createLogger } from '@rr/shared/utils';
import { parseUrlComponents } from '@rr/url-parser';

import type {
  NormalizeProductViewEventOptions,
  NormalizedProduct,
  RawProductViewEvent,
} from './types.js';
import { RawProductViewEventSchema } from './types.js';

const logger = createLogger('product-event-normalizer');

// Pre-frozen empty array constant to avoid repeated Object.freeze([]) calls
const EMPTY_FROZEN_ARRAY: readonly string[] = Object.freeze([]);

/**
 * Helper to filter non-empty strings from an array.
 * Caches the trimmed value to avoid double-trim operations.
 */
function filterNonEmpty(arr: string[] | undefined): string[] {
  if (!arr || arr.length === 0) return [];
  const result: string[] = [];
  for (const s of arr) {
    if (s) {
      const trimmed = s.trim();
      if (trimmed !== '') {
        result.push(s);
      }
    }
  }
  return result;
}

/**
 * Helper to check if a string is non-empty (with cached trim)
 */
function isNonEmptyString(s: string | undefined): s is string {
  return s !== undefined && s.trim() !== '';
}

/**
 * Extract product IDs from URL using the product-id-extractor
 */
function extractProductIdsFromUrl(
  url: string | undefined,
  storeId: string | undefined,
): readonly string[] {
  if (!url) {
    return EMPTY_FROZEN_ARRAY;
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
    return EMPTY_FROZEN_ARRAY;
  }
}

/**
 * Collect all product identifiers from schema.org sources
 * Handles both Toolbar and App naming conventions
 *
 * Separates parent product IDs from variant SKUs:
 * - productIds: Parent product identifiers (from productID/productid_list)
 * - variantSkus: Size/color variant SKUs (from sku, offers, urlToSku, priceToSku)
 * - gtins/mpns: May be parent-level or variant-level (kept separate)
 *
 * Optimized for performance:
 * - Uses single helper function for filtering
 * - Avoids intermediate array allocations where possible
 * - Lazy array initialization (only create if needed)
 */
function collectSchemaProductIds(event: RawProductViewEvent): {
  skus: string[];
  gtins: string[];
  mpns: string[];
  productIds: string[];
  variantSkus: string[];
} {
  // Lazy initialization - only create arrays when needed
  let skus: string[] | undefined;
  let gtins: string[] | undefined;
  let mpns: string[] | undefined;
  let productIds: string[] | undefined;
  let variantSkus: string[] | undefined;

  // Helper to get or create array
  const getSkus = () => (skus ??= []);
  const getGtins = () => (gtins ??= []);
  const getMpns = () => (mpns ??= []);
  const getProductIds = () => (productIds ??= []);
  const getVariantSkus = () => (variantSkus ??= []);

  // =============================================================================
  // DUAL FORMAT SUPPORT: Both singular and _list formats are supported
  // =============================================================================
  // We support both formats because:
  // 1. Platform differences: Toolbar uses singular (sku), App uses list (sku_list)
  // 2. Historical data: Snowflake data may contain either format depending on capture date
  // 3. Data capture evolution: The capture layer has changed over time
  //
  // When both formats are present, values are COMBINED and later deduplicated.
  // =============================================================================

  // Collect SKUs from sku/sku_list arrays (both formats supported)
  // These go to both skus (for backwards compat) and variantSkus (for variant tracking)
  const skuFiltered = filterNonEmpty(event.sku);
  if (skuFiltered.length > 0) {
    getSkus().push(...skuFiltered);
    getVariantSkus().push(...skuFiltered);
  }

  const skuListFiltered = filterNonEmpty(event.sku_list);
  if (skuListFiltered.length > 0) {
    getSkus().push(...skuListFiltered);
    getVariantSkus().push(...skuListFiltered);
  }

  // Collect GTINs from gtin/gtin_list arrays (both formats supported)
  const gtinFiltered = filterNonEmpty(event.gtin);
  if (gtinFiltered.length > 0) getGtins().push(...gtinFiltered);

  const gtinListFiltered = filterNonEmpty(event.gtin_list);
  if (gtinListFiltered.length > 0) getGtins().push(...gtinListFiltered);

  // Collect MPNs from mpn/mpn_list arrays (both formats supported)
  const mpnFiltered = filterNonEmpty(event.mpn);
  if (mpnFiltered.length > 0) getMpns().push(...mpnFiltered);

  const mpnListFiltered = filterNonEmpty(event.mpn_list);
  if (mpnListFiltered.length > 0) getMpns().push(...mpnListFiltered);

  // Collect product IDs from productID/productid_list arrays (both formats supported)
  const pidFiltered = filterNonEmpty(event.productID);
  if (pidFiltered.length > 0) getProductIds().push(...pidFiltered);

  const pidListFiltered = filterNonEmpty(event.productid_list);
  if (pidListFiltered.length > 0) getProductIds().push(...pidListFiltered);

  // Extract SKUs from offers (Toolbar: offers[].sku)
  // These are variant-level SKUs
  if (event.offers && event.offers.length > 0) {
    for (const offer of event.offers) {
      if (isNonEmptyString(offer.sku)) {
        getSkus().push(offer.sku);
        getVariantSkus().push(offer.sku);
      }
    }
  }

  // Extract SKUs from offer_list (App: offer_list[].offer_sku)
  // These are variant-level SKUs
  if (event.offer_list && event.offer_list.length > 0) {
    for (const offer of event.offer_list) {
      if (isNonEmptyString(offer.offer_sku)) {
        getSkus().push(offer.offer_sku);
        getVariantSkus().push(offer.offer_sku);
      }
    }
  }

  // Extract SKUs from urlToSku map values (Toolbar only)
  // These are variant-level SKUs (each URL represents a variant)
  if (event.urlToSku) {
    for (const sku of Object.values(event.urlToSku)) {
      if (isNonEmptyString(sku)) {
        getSkus().push(sku);
        getVariantSkus().push(sku);
      }
    }
  }

  // Extract SKUs from priceToSku map values (Toolbar only)
  // These are variant-level SKUs (grouped by price)
  if (event.priceToSku) {
    for (const sku of Object.values(event.priceToSku)) {
      if (isNonEmptyString(sku)) {
        getSkus().push(sku);
        getVariantSkus().push(sku);
      }
    }
  }

  return {
    skus: skus ?? [],
    gtins: gtins ?? [],
    mpns: mpns ?? [],
    productIds: productIds ?? [],
    variantSkus: variantSkus ?? [],
  };
}

/**
 * Deduplicate productIds and variant SKUs
 *
 * Note: productIds contains ONLY schema.org productID/productid_list values,
 * NOT SKUs, GTINs, or MPNs (those are separate fields in the output)
 */
function consolidateProductIds(collected: {
  skus: string[];
  gtins: string[];
  mpns: string[];
  productIds: string[];
  variantSkus: string[];
}): {
  productIds: readonly string[];
  variantSkus: readonly string[];
} {
  // Deduplicate productIds (only schema.org productID field values)
  const productIdSet = new Set(collected.productIds);
  const productIds =
    productIdSet.size > 0 ? Object.freeze(Array.from(productIdSet)) : EMPTY_FROZEN_ARRAY;

  // Deduplicate variant SKUs
  const variantSkuSet = new Set(collected.variantSkus);
  const variantSkus =
    variantSkuSet.size > 0 ? Object.freeze(Array.from(variantSkuSet)) : EMPTY_FROZEN_ARRAY;

  return { productIds, variantSkus };
}

/**
 * Extract the primary URL from the event
 */
function extractUrl(event: RawProductViewEvent): string | undefined {
  // Prefer url, then product_url, then page_url
  if (isNonEmptyString(event.url)) return event.url;
  if (isNonEmptyString(event.product_url)) return event.product_url;
  if (isNonEmptyString(event.page_url)) return event.page_url;
  return undefined;
}

/**
 * Extract the primary image URL from the event
 */
function extractImageUrl(event: RawProductViewEvent): string | undefined {
  // Prefer image_url, then first item of image_url_list
  if (isNonEmptyString(event.image_url)) return event.image_url;
  if (event.image_url_list && event.image_url_list.length > 0) {
    const firstImage = event.image_url_list[0];
    if (isNonEmptyString(firstImage)) return firstImage;
  }
  return undefined;
}

/**
 * Extract the primary price from the event
 */
function extractPrice(event: RawProductViewEvent): number | undefined {
  // Try Toolbar offers first
  if (event.offers && event.offers.length > 0) {
    const firstOffer = event.offers[0];
    if (firstOffer?.price !== undefined) {
      return firstOffer.price;
    }
  }

  // Try App offer_list
  if (event.offer_list && event.offer_list.length > 0) {
    const firstOffer = event.offer_list[0];
    if (firstOffer?.offer_amount !== undefined) {
      return firstOffer.offer_amount;
    }
  }

  return undefined;
}

/**
 * Extract brand from the event
 */
function extractBrand(event: RawProductViewEvent): string | undefined {
  if (isNonEmptyString(event.brand)) return event.brand;
  if (event.brand_list && event.brand_list.length > 0) {
    const firstBrand = event.brand_list[0];
    if (isNonEmptyString(firstBrand)) return firstBrand;
  }
  return undefined;
}

/**
 * Extract category from the event
 */
function extractCategory(event: RawProductViewEvent): string | undefined {
  if (isNonEmptyString(event.category)) return event.category;
  if (isNonEmptyString(event.breadcrumbs)) return event.breadcrumbs;
  return undefined;
}

/**
 * Extract color from the event
 */
function extractColor(event: RawProductViewEvent): string | undefined {
  if (isNonEmptyString(event.color)) return event.color;
  if (event.color_list && event.color_list.length > 0) {
    const firstColor = event.color_list[0];
    if (isNonEmptyString(firstColor)) return firstColor;
  }
  return undefined;
}

/**
 * Build a fingerprint for a normalized product to enable deduplication.
 * Uses available schema.org identifiers and core product fields.
 * Returns undefined if no meaningful fingerprint can be created.
 *
 * Fingerprint includes (when available):
 * - title, url, price (core identifying fields)
 * - skus, gtins, mpns, productIds (schema.org identifiers)
 */
function buildProductFingerprint(product: NormalizedProduct): string | undefined {
  const parts: string[] = [];

  // Core identifying fields
  if (product.title) {
    parts.push(`title:${product.title}`);
  }
  if (product.url) {
    parts.push(`url:${product.url}`);
  }
  if (product.price !== undefined) {
    parts.push(`price:${product.price}`);
  }

  // Schema.org identifiers from ids object (sorted for consistent fingerprints)
  if (product.ids.skus && product.ids.skus.length > 0) {
    parts.push(`skus:${[...product.ids.skus].sort().join(',')}`);
  }
  if (product.ids.gtins && product.ids.gtins.length > 0) {
    parts.push(`gtins:${[...product.ids.gtins].sort().join(',')}`);
  }
  if (product.ids.mpns && product.ids.mpns.length > 0) {
    parts.push(`mpns:${[...product.ids.mpns].sort().join(',')}`);
  }

  // productIds from ids object
  if (product.ids.productIds.length > 0) {
    parts.push(`ids:${[...product.ids.productIds].sort().join(',')}`);
  }

  // If we have nothing to fingerprint, can't deduplicate
  if (parts.length === 0) {
    return undefined;
  }

  return parts.join('|');
}

/**
 * Deduplicate products based on their fingerprint.
 * Keeps the first occurrence of each unique product.
 * Products without a fingerprint (no identifiable data) are always kept.
 */
function deduplicateProducts(products: NormalizedProduct[]): NormalizedProduct[] {
  const seen = new Set<string>();
  const result: NormalizedProduct[] = [];

  for (const product of products) {
    const fingerprint = buildProductFingerprint(product);

    if (fingerprint === undefined) {
      // No fingerprint means we can't deduplicate - keep the product
      result.push(product);
    } else if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      result.push(product);
    }
    // If fingerprint already seen, skip this duplicate
  }

  return result;
}

/**
 * Normalize a raw product view event into a clean NormalizedProduct array
 *
 * @param event - Raw product view event from apps/extensions
 * @param options - Normalization options
 * @returns Frozen array of normalized product objects
 *
 * @example
 * ```ts
 * const products = normalizeProductViewEvent(rawEvent);
 * // [{ title: "Product", url: "...", storeId: "8333", productIds: ["SKU123", "GTIN456"] }]
 * ```
 */
export function normalizeProductViewEvent(
  event: RawProductViewEvent,
  options: NormalizeProductViewEventOptions = {},
): readonly NormalizedProduct[] {
  const {
    validate = false,
    extractProductIds: shouldExtractFromUrl = true,
    includeMetadata = true,
  } = options;

  // Validate input if requested
  if (validate) {
    RawProductViewEventSchema.parse(event);
  }

  // Coerce store_id to string
  const storeId = coerceStoreId(event.store_id);

  // Collect all schema-based product identifiers
  const collected = collectSchemaProductIds(event);

  // Consolidate and deduplicate schema.org productID values and variant SKUs
  const consolidated = consolidateProductIds(collected);
  const productIds = consolidated.productIds;
  const variantSkus = consolidated.variantSkus;

  // Extract URL and attempt URL-based extraction (always, as separate data source)
  const url = extractUrl(event);
  let extractedIds: readonly string[] = EMPTY_FROZEN_ARRAY;
  if (shouldExtractFromUrl && url) {
    extractedIds = extractProductIdsFromUrl(url, storeId);
  }

  // Build the ids object with all identifier types
  // SKUs, GTINs, MPNs are only included when metadata is enabled and values exist
  const ids: NormalizedProduct['ids'] = {
    productIds,
    extractedIds,
  };

  // Add specific identifier arrays (deduplicated) when metadata is enabled
  if (includeMetadata) {
    if (collected.skus.length > 0) {
      ids.skus = Object.freeze([...new Set(collected.skus)]);
    }
    if (collected.gtins.length > 0) {
      ids.gtins = Object.freeze([...new Set(collected.gtins)]);
    }
    if (collected.mpns.length > 0) {
      ids.mpns = Object.freeze([...new Set(collected.mpns)]);
    }
  }

  // Build the normalized product with nested ids object
  const normalized: NormalizedProduct = {
    ids: Object.freeze(ids),
  };

  // Add core fields
  if (event.name && event.name.trim() !== '') {
    normalized.title = event.name;
  }

  if (url) {
    normalized.url = url;
  }

  const imageUrl = extractImageUrl(event);
  if (imageUrl) {
    normalized.imageUrl = imageUrl;
  }

  if (storeId !== undefined) {
    normalized.storeId = storeId;
  }

  const price = extractPrice(event);
  if (price !== undefined) {
    normalized.price = price;
  }

  // Add metadata fields if enabled
  if (includeMetadata) {
    const brand = extractBrand(event);
    if (brand) {
      normalized.brand = brand;
    }

    const category = extractCategory(event);
    if (category) {
      normalized.category = category;
    }

    if (event.description && event.description.trim() !== '') {
      normalized.description = event.description;
    }

    if (event.rating !== undefined) {
      normalized.rating = event.rating;
    }

    const color = extractColor(event);
    if (color) {
      normalized.color = color;
    }

    // Add variant information if there are multiple variant SKUs
    if (variantSkus.length > 0) {
      normalized.variantSkus = variantSkus;
      normalized.variantCount = variantSkus.length;
      normalized.hasVariants = variantSkus.length > 1;
    }
  }

  // Wrap in array and deduplicate
  // Note: Currently single-product, but deduplication supports future multi-product handling
  const products = [normalized];
  const deduplicated = deduplicateProducts(products);

  return Object.freeze(deduplicated.map((p) => Object.freeze(p)));
}
