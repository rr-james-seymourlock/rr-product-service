import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { coerceStoreId } from '@rr/shared/utils';
import { parseUrlComponents } from '@rr/url-parser';

import type {
  NormalizeProductViewEventOptions,
  NormalizedProduct,
  RawProductViewEvent,
} from './types.js';
import { RawProductViewEventSchema } from './types.js';

/**
 * Extract product IDs from URL using the product-id-extractor
 */
function extractProductIdsFromUrl(
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
 * Collect all product identifiers from schema.org sources
 * Handles both Toolbar and App naming conventions
 */
function collectSchemaProductIds(event: RawProductViewEvent): {
  skus: string[];
  gtins: string[];
  mpns: string[];
  productIds: string[];
} {
  const skus: string[] = [];
  const gtins: string[] = [];
  const mpns: string[] = [];
  const productIds: string[] = [];

  // Collect SKUs from sku/sku_list arrays
  if (event.sku) {
    skus.push(...event.sku.filter((s) => s && s.trim() !== ''));
  }
  if (event.sku_list) {
    skus.push(...event.sku_list.filter((s) => s && s.trim() !== ''));
  }

  // Collect GTINs from gtin/gtin_list arrays
  if (event.gtin) {
    gtins.push(...event.gtin.filter((g) => g && g.trim() !== ''));
  }
  if (event.gtin_list) {
    gtins.push(...event.gtin_list.filter((g) => g && g.trim() !== ''));
  }

  // Collect MPNs from mpn/mpn_list arrays
  if (event.mpn) {
    mpns.push(...event.mpn.filter((m) => m && m.trim() !== ''));
  }
  if (event.mpn_list) {
    mpns.push(...event.mpn_list.filter((m) => m && m.trim() !== ''));
  }

  // Collect product IDs from productID/productid_list arrays
  if (event.productID) {
    productIds.push(...event.productID.filter((p) => p && p.trim() !== ''));
  }
  if (event.productid_list) {
    productIds.push(...event.productid_list.filter((p) => p && p.trim() !== ''));
  }

  // Extract SKUs from offers (Toolbar: offers[].sku)
  if (event.offers) {
    for (const offer of event.offers) {
      if (offer.sku && offer.sku.trim() !== '') {
        skus.push(offer.sku);
      }
    }
  }

  // Extract SKUs from offer_list (App: offer_list[].offer_sku)
  if (event.offer_list) {
    for (const offer of event.offer_list) {
      if (offer.offer_sku && offer.offer_sku.trim() !== '') {
        skus.push(offer.offer_sku);
      }
    }
  }

  // Extract SKUs from urlToSku map values (Toolbar only)
  if (event.urlToSku) {
    for (const sku of Object.values(event.urlToSku)) {
      if (sku && sku.trim() !== '') {
        skus.push(sku);
      }
    }
  }

  // Extract SKUs from priceToSku map values (Toolbar only)
  if (event.priceToSku) {
    for (const sku of Object.values(event.priceToSku)) {
      if (sku && sku.trim() !== '') {
        skus.push(sku);
      }
    }
  }

  return { skus, gtins, mpns, productIds };
}

/**
 * Deduplicate and combine all product identifiers
 */
function consolidateProductIds(collected: {
  skus: string[];
  gtins: string[];
  mpns: string[];
  productIds: string[];
}): readonly string[] {
  const allIds = new Set<string>();

  // Add all collected IDs to the set for deduplication
  for (const sku of collected.skus) {
    allIds.add(sku);
  }
  for (const gtin of collected.gtins) {
    allIds.add(gtin);
  }
  for (const mpn of collected.mpns) {
    allIds.add(mpn);
  }
  for (const pid of collected.productIds) {
    allIds.add(pid);
  }

  return Object.freeze([...allIds]);
}

/**
 * Extract the primary URL from the event
 */
function extractUrl(event: RawProductViewEvent): string | undefined {
  // Prefer url, then product_url, then page_url
  if (event.url && event.url.trim() !== '') {
    return event.url;
  }
  if (event.product_url && event.product_url.trim() !== '') {
    return event.product_url;
  }
  if (event.page_url && event.page_url.trim() !== '') {
    return event.page_url;
  }
  return undefined;
}

/**
 * Extract the primary image URL from the event
 */
function extractImageUrl(event: RawProductViewEvent): string | undefined {
  // Prefer image_url, then first item of image_url_list
  if (event.image_url && event.image_url.trim() !== '') {
    return event.image_url;
  }
  if (event.image_url_list && event.image_url_list.length > 0) {
    const firstImage = event.image_url_list[0];
    if (firstImage && firstImage.trim() !== '') {
      return firstImage;
    }
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
  if (event.brand && event.brand.trim() !== '') {
    return event.brand;
  }
  if (event.brand_list && event.brand_list.length > 0) {
    const firstBrand = event.brand_list[0];
    if (firstBrand && firstBrand.trim() !== '') {
      return firstBrand;
    }
  }
  return undefined;
}

/**
 * Extract category from the event
 */
function extractCategory(event: RawProductViewEvent): string | undefined {
  if (event.category && event.category.trim() !== '') {
    return event.category;
  }
  if (event.breadcrumbs && event.breadcrumbs.trim() !== '') {
    return event.breadcrumbs;
  }
  return undefined;
}

/**
 * Extract color from the event
 */
function extractColor(event: RawProductViewEvent): string | undefined {
  if (event.color && event.color.trim() !== '') {
    return event.color;
  }
  if (event.color_list && event.color_list.length > 0) {
    const firstColor = event.color_list[0];
    if (firstColor && firstColor.trim() !== '') {
      return firstColor;
    }
  }
  return undefined;
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

  // Consolidate and deduplicate
  let productIds = consolidateProductIds(collected);

  // If no schema IDs found and URL extraction is enabled, try URL-based extraction
  const url = extractUrl(event);
  if (productIds.length === 0 && shouldExtractFromUrl && url) {
    productIds = extractProductIdsFromUrl(url, storeId);
  }

  // Build the normalized product
  const normalized: NormalizedProduct = {
    productIds,
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

    // Add specific identifier arrays (deduplicated)
    if (collected.skus.length > 0) {
      normalized.skus = Object.freeze([...new Set(collected.skus)]);
    }

    if (collected.gtins.length > 0) {
      normalized.gtins = Object.freeze([...new Set(collected.gtins)]);
    }

    if (collected.mpns.length > 0) {
      normalized.mpns = Object.freeze([...new Set(collected.mpns)]);
    }
  }

  // Return as a single-item frozen array
  // Note: Multi-product handling can be added later based on urlToSku/offers analysis
  return Object.freeze([Object.freeze(normalized)]);
}
