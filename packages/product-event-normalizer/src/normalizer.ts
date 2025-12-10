import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { coerceStoreId, createLogger } from '@rr/shared/utils';
import { parseUrlComponents } from '@rr/url-parser';

import type {
  AppOffer,
  NormalizeProductViewEventOptions,
  NormalizedProduct,
  ProductVariant,
  RawProductViewEvent,
  ToolbarOffer,
} from './types.js';
import { RawProductViewEventSchema } from './types.js';

const logger = createLogger('product-event-normalizer');

// Pre-frozen empty array constant to avoid repeated Object.freeze([]) calls
const EMPTY_FROZEN_ARRAY: readonly string[] = Object.freeze([]);
const EMPTY_FROZEN_VARIANTS: readonly ProductVariant[] = Object.freeze([]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract first string from string or array
 */
function extractFirstString(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' ? trimmed : undefined;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (first) {
      const trimmed = first.trim();
      return trimmed !== '' ? trimmed : undefined;
    }
  }
  return undefined;
}

/**
 * Extract all strings from string or array (for variant-level data)
 */
function extractAllStrings(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((s) => s && s.trim() !== '').map((s) => s.trim());
  }
  return [];
}

/**
 * Extract first number from number, string, or array
 */
function extractFirstNumber(
  value: number | string | (string | number)[] | undefined,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'number') return first;
    if (typeof first === 'string') {
      const parsed = parseFloat(first);
      return isNaN(parsed) ? undefined : parsed;
    }
  }
  return undefined;
}

/**
 * Helper to filter non-empty strings from an array.
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
 * Helper to check if a string is non-empty
 */
function isNonEmptyString(s: string | undefined): s is string {
  return s !== undefined && s.trim() !== '';
}

/**
 * Parse price from various formats to cents (integer)
 */
function parsePriceToCents(price: unknown): {
  amount: number | undefined;
  currency: string | undefined;
} {
  if (price === undefined || price === null) {
    return { amount: undefined, currency: undefined };
  }

  // Already a number (assume cents)
  if (typeof price === 'number') {
    return { amount: Math.round(price), currency: undefined };
  }

  // String - parse as dollars and convert to cents
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    if (!isNaN(parsed)) {
      // If it looks like dollars (has decimal or < 1000), convert to cents
      // If it looks like cents (integer > 1000), keep as-is
      const amount = price.includes('.') || parsed < 100 ? Math.round(parsed * 100) : parsed;
      return { amount, currency: undefined };
    }
    return { amount: undefined, currency: undefined };
  }

  // Nested object { amount, currency }
  if (typeof price === 'object' && price !== null && 'amount' in price) {
    const priceObj = price as { amount?: string | number; currency?: string };
    const priceAmount = priceObj.amount;
    const currency = priceObj.currency;
    if (priceAmount !== undefined) {
      const parsed =
        typeof priceAmount === 'number' ? priceAmount : parseFloat(String(priceAmount));
      if (!isNaN(parsed)) {
        // Convert dollars to cents if it looks like dollars
        const amount =
          String(priceAmount).includes('.') || parsed < 100 ? Math.round(parsed * 100) : parsed;
        return { amount, currency };
      }
    }
    return { amount: undefined, currency };
  }

  return { amount: undefined, currency: undefined };
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
    logger.debug(
      { url, storeId, error: error instanceof Error ? error.message : String(error) },
      'URL parsing or extraction failed',
    );
    return EMPTY_FROZEN_ARRAY;
  }
}

// =============================================================================
// IDENTIFIER COLLECTION
// =============================================================================

interface CollectedIdentifiers {
  skus: string[];
  gtins: string[];
  mpns: string[];
  productIds: string[];
}

/**
 * Collect all product identifiers from schema.org sources
 * Handles both Toolbar and App naming conventions
 */
function collectSchemaIdentifiers(event: RawProductViewEvent): CollectedIdentifiers {
  const skus: string[] = [];
  const gtins: string[] = [];
  const mpns: string[] = [];
  const productIds: string[] = [];

  // Collect SKUs from sku/sku_list arrays
  skus.push(...filterNonEmpty(event.sku));
  skus.push(...filterNonEmpty(event.sku_list));

  // Collect GTINs
  gtins.push(...filterNonEmpty(event.gtin));
  gtins.push(...filterNonEmpty(event.gtin_list));

  // Collect MPNs
  mpns.push(...filterNonEmpty(event.mpn));
  mpns.push(...filterNonEmpty(event.mpn_list));

  // Collect product IDs
  productIds.push(...filterNonEmpty(event.productID));
  productIds.push(...filterNonEmpty(event.productid_list));

  // Extract SKUs from offers (Toolbar: offers[].sku)
  if (event.offers && event.offers.length > 0) {
    for (const offer of event.offers) {
      if (isNonEmptyString(offer.sku)) {
        skus.push(offer.sku);
      }
    }
  }

  // Extract SKUs from offer_list (App: offer_list[].offer_sku)
  if (event.offer_list && event.offer_list.length > 0) {
    for (const offer of event.offer_list) {
      if (isNonEmptyString(offer.offer_sku)) {
        skus.push(offer.offer_sku);
      }
    }
  }

  // Extract SKUs from urlToSku map values
  if (event.urlToSku) {
    for (const value of Object.values(event.urlToSku)) {
      if (typeof value === 'string' && isNonEmptyString(value)) {
        skus.push(value);
      } else if (Array.isArray(value)) {
        skus.push(...filterNonEmpty(value));
      }
    }
  }

  // Extract SKUs from priceToSku map values
  if (event.priceToSku) {
    for (const value of Object.values(event.priceToSku)) {
      if (typeof value === 'string' && isNonEmptyString(value)) {
        skus.push(value);
      } else if (Array.isArray(value)) {
        skus.push(...filterNonEmpty(value));
      }
    }
  }

  return { skus, gtins, mpns, productIds };
}

// =============================================================================
// VARIANT BUILDING
// =============================================================================

interface VariantData {
  sku: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  color?: string;
}

/**
 * Build variants from Toolbar offers array
 */
function buildVariantsFromToolbarOffers(
  offers: ToolbarOffer[],
  _storeId: string | undefined,
): VariantData[] {
  const variants: VariantData[] = [];

  for (const offer of offers) {
    if (!offer.sku) continue;

    const variant: VariantData = { sku: offer.sku };

    if (offer.url) {
      variant.url = offer.url;
    }

    // Parse price from flat or nested format
    const { amount, currency } = parsePriceToCents(offer.price);
    if (amount !== undefined) {
      variant.price = amount;
    }
    if (currency) {
      variant.currency = currency;
    }

    variants.push(variant);
  }

  return variants;
}

/**
 * Build variants from App offer_list array
 */
function buildVariantsFromAppOffers(
  offers: AppOffer[],
  _storeId: string | undefined,
): VariantData[] {
  const variants: VariantData[] = [];

  for (const offer of offers) {
    if (!offer.offer_sku) continue;

    const variant: VariantData = { sku: offer.offer_sku };

    if (offer.offer_amount !== undefined) {
      const parsed =
        typeof offer.offer_amount === 'number'
          ? offer.offer_amount
          : parseFloat(offer.offer_amount);
      if (!isNaN(parsed)) {
        // Convert to cents if looks like dollars
        variant.price =
          String(offer.offer_amount).includes('.') || parsed < 100
            ? Math.round(parsed * 100)
            : parsed;
      }
    }

    if (offer.offer_currency) {
      variant.currency = offer.offer_currency;
    }

    variants.push(variant);
  }

  return variants;
}

/**
 * Build variants from urlToSku map (each URL is a variant)
 * This is the most reliable source for variant correlation
 */
function buildVariantsFromUrlToSku(
  urlToSku: Record<string, string | string[]>,
  event: RawProductViewEvent,
  _storeId: string | undefined,
): VariantData[] {
  const variants: VariantData[] = [];
  const urlArray = extractAllStrings(event.url);
  const imageArray = event.image ?? event.image_url_list ?? [];
  const colorArray = extractAllStrings(event.color).concat(event.color_list ?? []);
  const priceArray = event.price ?? [];

  for (const [url, skuValue] of Object.entries(urlToSku)) {
    const skus = typeof skuValue === 'string' ? [skuValue] : skuValue;

    for (const sku of skus) {
      if (!sku || sku.trim() === '') continue;

      const variant: VariantData = { sku, url };

      // Find corresponding index in url array for correlation
      const urlIndex = urlArray.indexOf(url);
      if (urlIndex !== -1) {
        // Get correlated image
        if (urlIndex < imageArray.length) {
          const img = imageArray[urlIndex];
          if (img && img.trim() !== '') {
            variant.imageUrl = img;
          }
        }

        // Get correlated color (less reliable, colors may not match 1:1)
        if (urlIndex < colorArray.length) {
          const color = colorArray[urlIndex];
          if (color && color.trim() !== '') {
            variant.color = color;
          }
        }

        // Get correlated price
        if (urlIndex < priceArray.length) {
          const { amount, currency } = parsePriceToCents(priceArray[urlIndex]);
          if (amount !== undefined) {
            variant.price = amount;
          }
          if (currency) {
            variant.currency = currency;
          }
        }
      }

      variants.push(variant);
    }
  }

  return variants;
}

/**
 * Build variants from parallel arrays when no urlToSku map
 * Falls back to SKU array + tries to correlate with other arrays
 */
function buildVariantsFromParallelArrays(
  event: RawProductViewEvent,
  collectedSkus: string[],
  _storeId: string | undefined,
): VariantData[] {
  const variants: VariantData[] = [];

  // Get unique SKUs
  const uniqueSkus = [...new Set(collectedSkus)];
  if (uniqueSkus.length === 0) return variants;

  // Get arrays for correlation
  const urlArray = extractAllStrings(event.url);
  const imageArray = event.image ?? event.image_url_list ?? [];
  const colorArray = extractAllStrings(event.color).concat(event.color_list ?? []);
  const priceArray = event.price ?? [];

  // Try to match SKUs with offers for price/URL info
  const skuToOffer = new Map<string, { url?: string; price?: number; currency?: string }>();

  if (event.offers) {
    for (const offer of event.offers) {
      if (offer.sku) {
        const { amount, currency } = parsePriceToCents(offer.price);
        const offerData: { url?: string; price?: number; currency?: string } = {};
        if (offer.url) offerData.url = offer.url;
        if (amount !== undefined) offerData.price = amount;
        if (currency) offerData.currency = currency;
        skuToOffer.set(offer.sku, offerData);
      }
    }
  }

  if (event.offer_list) {
    for (const offer of event.offer_list) {
      if (offer.offer_sku) {
        const offerData: { url?: string; price?: number; currency?: string } = {};
        if (offer.offer_amount !== undefined) {
          const amount =
            typeof offer.offer_amount === 'number'
              ? offer.offer_amount
              : parseFloat(String(offer.offer_amount));
          if (!isNaN(amount)) {
            offerData.price =
              String(offer.offer_amount).includes('.') || amount < 100
                ? Math.round(amount * 100)
                : amount;
          }
        }
        if (offer.offer_currency) offerData.currency = offer.offer_currency;
        skuToOffer.set(offer.offer_sku, offerData);
      }
    }
  }

  for (let i = 0; i < uniqueSkus.length; i++) {
    const sku = uniqueSkus[i];
    if (!sku) continue;

    const variant: VariantData = { sku };

    // Check for offer data first
    const offerData = skuToOffer.get(sku);
    if (offerData) {
      if (offerData.url) variant.url = offerData.url;
      if (offerData.price !== undefined) variant.price = offerData.price;
      if (offerData.currency) variant.currency = offerData.currency;
    }

    // If no URL from offer, try index-based correlation (less reliable)
    if (!variant.url && i < urlArray.length) {
      const urlValue = urlArray[i];
      if (urlValue) {
        variant.url = urlValue;
      }
    }

    // Index-based image correlation
    if (i < imageArray.length) {
      const img = imageArray[i];
      if (img && img.trim() !== '') {
        variant.imageUrl = img;
      }
    }

    // Index-based color correlation
    if (i < colorArray.length) {
      const color = colorArray[i];
      if (color && color.trim() !== '') {
        variant.color = color;
      }
    }

    // Index-based price correlation (if not from offer)
    if (variant.price === undefined && i < priceArray.length) {
      const { amount, currency } = parsePriceToCents(priceArray[i]);
      if (amount !== undefined) {
        variant.price = amount;
      }
      if (currency && !variant.currency) {
        variant.currency = currency;
      }
    }

    variants.push(variant);
  }

  return variants;
}

/**
 * Build final ProductVariant objects with extracted IDs
 */
function buildProductVariants(
  variantData: VariantData[],
  storeId: string | undefined,
  shouldExtractFromUrl: boolean,
): readonly ProductVariant[] {
  if (variantData.length === 0) {
    return EMPTY_FROZEN_VARIANTS;
  }

  const variants: ProductVariant[] = [];
  const seenSkus = new Set<string>();

  for (const data of variantData) {
    // Dedupe by SKU
    if (seenSkus.has(data.sku)) continue;
    seenSkus.add(data.sku);

    const variant: ProductVariant = { sku: data.sku };

    if (data.url) {
      variant.url = data.url;

      // Extract IDs from variant URL for joining
      if (shouldExtractFromUrl) {
        const extracted = extractProductIdsFromUrl(data.url, storeId);
        if (extracted.length > 0) {
          variant.extractedIds = extracted;
        }
      }
    }

    if (data.imageUrl) {
      variant.imageUrl = data.imageUrl;
    }

    if (data.price !== undefined) {
      variant.price = data.price;
    }

    if (data.currency) {
      variant.currency = data.currency;
    }

    if (data.color) {
      variant.color = data.color;
    }

    variants.push(variant);
  }

  return Object.freeze(variants);
}

// =============================================================================
// SHARED FIELD EXTRACTION
// =============================================================================

/**
 * Extract the primary URL from the event (for product-level URL)
 */
function extractPrimaryUrl(event: RawProductViewEvent): string | undefined {
  // Prefer canonical URL if available
  if (event.canonical && event.canonical.length > 0) {
    const canonical = event.canonical[0];
    if (canonical && canonical.trim() !== '') {
      return canonical;
    }
  }

  // Then url field (first if array)
  const url = extractFirstString(event.url);
  if (url) return url;

  // Then product_url
  if (isNonEmptyString(event.product_url)) return event.product_url;

  // Then page_url
  if (isNonEmptyString(event.page_url)) return event.page_url;

  return undefined;
}

/**
 * Extract the primary image URL from the event
 */
function extractPrimaryImageUrl(event: RawProductViewEvent): string | undefined {
  // Prefer image array (Toolbar format)
  if (event.image && event.image.length > 0) {
    const img = event.image[0];
    if (img && img.trim() !== '') return img;
  }

  // Then image_url (single string)
  if (isNonEmptyString(event.image_url)) return event.image_url;

  // Then image_url_list (App format)
  if (event.image_url_list && event.image_url_list.length > 0) {
    const img = event.image_url_list[0];
    if (img && img.trim() !== '') return img;
  }

  return undefined;
}

/**
 * Extract primary price (for backwards compatibility)
 */
function extractPrimaryPrice(event: RawProductViewEvent): {
  price: number | undefined;
  currency: string | undefined;
} {
  // Try Toolbar offers first
  if (event.offers && event.offers.length > 0) {
    const firstOffer = event.offers[0];
    if (firstOffer) {
      const { amount, currency } = parsePriceToCents(firstOffer.price);
      if (amount !== undefined) {
        return { price: amount, currency };
      }
    }
  }

  // Try App offer_list
  if (event.offer_list && event.offer_list.length > 0) {
    const firstOffer = event.offer_list[0];
    if (firstOffer?.offer_amount !== undefined) {
      const parsed =
        typeof firstOffer.offer_amount === 'number'
          ? firstOffer.offer_amount
          : parseFloat(firstOffer.offer_amount);
      if (!isNaN(parsed)) {
        const price =
          String(firstOffer.offer_amount).includes('.') || parsed < 100
            ? Math.round(parsed * 100)
            : parsed;
        return { price, currency: firstOffer.offer_currency };
      }
    }
  }

  // Try price array
  if (event.price && event.price.length > 0) {
    const { amount, currency } = parsePriceToCents(event.price[0]);
    if (amount !== undefined) {
      return { price: amount, currency: currency ?? event.priceCurrency?.[0] };
    }
  }

  // Try priceInCents array
  if (event.priceInCents && event.priceInCents.length > 0) {
    const first = event.priceInCents[0];
    const parsed = typeof first === 'number' ? first : parseInt(String(first), 10);
    if (!isNaN(parsed)) {
      return { price: parsed, currency: event.priceCurrency?.[0] };
    }
  }

  return { price: undefined, currency: undefined };
}

/**
 * Extract brand from the event
 */
function extractBrand(event: RawProductViewEvent): string | undefined {
  const brand = extractFirstString(event.brand);
  if (brand) return brand;

  if (event.brand_list && event.brand_list.length > 0) {
    const firstBrand = event.brand_list[0];
    if (firstBrand && firstBrand.trim() !== '') return firstBrand;
  }

  return undefined;
}

/**
 * Extract category from the event
 */
function extractCategory(event: RawProductViewEvent): string | undefined {
  const category = extractFirstString(event.category);
  if (category) return category;

  const breadcrumbs = extractFirstString(event.breadcrumbs);
  if (breadcrumbs) return breadcrumbs;

  return undefined;
}

/**
 * Extract color from the event (primary color)
 */
function extractPrimaryColor(event: RawProductViewEvent): string | undefined {
  const color = extractFirstString(event.color);
  if (color) return color;

  if (event.color_list && event.color_list.length > 0) {
    const firstColor = event.color_list[0];
    if (firstColor && firstColor.trim() !== '') return firstColor;
  }

  return undefined;
}

// =============================================================================
// MAIN NORMALIZER
// =============================================================================

/**
 * Normalize a raw product view event into a clean NormalizedProduct array
 *
 * The output structure separates:
 * - Shared product-level data (title, brand, description, rating, category)
 * - Aggregated identifiers in `ids` (productIds, extractedIds, all SKUs, GTINs, MPNs)
 * - Variant-specific data in `variants` array (sku, url, image, price, color)
 *
 * This enables joining cart items (which have specific SKU/URL) to the right variant
 * while inheriting shared product metadata.
 *
 * @param event - Raw product view event from apps/extensions
 * @param options - Normalization options
 * @returns Frozen array of normalized product objects (typically 1 product)
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

  // Collect all schema-based identifiers
  const collected = collectSchemaIdentifiers(event);

  // Extract primary URL and get extractedIds
  const primaryUrl = extractPrimaryUrl(event);
  let extractedIds: readonly string[] = EMPTY_FROZEN_ARRAY;
  if (shouldExtractFromUrl && primaryUrl) {
    extractedIds = extractProductIdsFromUrl(primaryUrl, storeId);
  }

  // Build variants from the best available source
  let variantData: VariantData[] = [];

  // Priority 1: urlToSku map (most reliable for variant correlation)
  if (event.urlToSku && Object.keys(event.urlToSku).length > 0) {
    variantData = buildVariantsFromUrlToSku(event.urlToSku, event, storeId);
  }
  // Priority 2: Toolbar offers with SKUs
  else if (event.offers && event.offers.length > 0 && event.offers.some((o) => o.sku)) {
    variantData = buildVariantsFromToolbarOffers(event.offers, storeId);
  }
  // Priority 3: App offer_list with SKUs
  else if (
    event.offer_list &&
    event.offer_list.length > 0 &&
    event.offer_list.some((o) => o.offer_sku)
  ) {
    variantData = buildVariantsFromAppOffers(event.offer_list, storeId);
  }
  // Priority 4: Fall back to parallel arrays
  else if (collected.skus.length > 0) {
    variantData = buildVariantsFromParallelArrays(event, collected.skus, storeId);
  }

  // Build final variant objects with extracted IDs
  const variants = buildProductVariants(variantData, storeId, shouldExtractFromUrl);

  // Build the ids object with all identifier types (deduplicated)
  const ids: NormalizedProduct['ids'] = {
    productIds:
      collected.productIds.length > 0
        ? Object.freeze([...new Set(collected.productIds)])
        : EMPTY_FROZEN_ARRAY,
    extractedIds,
  };

  // Add specific identifier arrays when metadata is enabled
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

  // Build the normalized product
  const normalized: NormalizedProduct = {
    ids: Object.freeze(ids),
    variants,
    variantCount: variants.length,
    hasVariants: variants.length > 1,
  };

  // Add shared product-level fields
  const title = extractFirstString(event.name);
  if (title) {
    normalized.title = title;
  }

  if (primaryUrl) {
    normalized.url = primaryUrl;
  }

  // Add canonical URL if different from primary URL
  if (event.canonical && event.canonical.length > 0) {
    const canonical = event.canonical[0];
    if (canonical && canonical.trim() !== '' && canonical !== primaryUrl) {
      normalized.canonicalUrl = canonical;
    }
  }

  const imageUrl = extractPrimaryImageUrl(event);
  if (imageUrl) {
    normalized.imageUrl = imageUrl;
  }

  if (storeId !== undefined) {
    normalized.storeId = storeId;
  }

  if (event.store_name) {
    normalized.storeName = event.store_name;
  }

  // Add metadata fields if enabled
  if (includeMetadata) {
    const brand = extractBrand(event);
    if (brand) {
      normalized.brand = brand;
    }

    const description = extractFirstString(event.description);
    if (description) {
      normalized.description = description;
    }

    const category = extractCategory(event);
    if (category) {
      normalized.category = category;
    }

    const rating = extractFirstNumber(event.rating);
    if (rating !== undefined) {
      normalized.rating = rating;
    }

    // Add primary/legacy fields for backwards compatibility
    const { price, currency } = extractPrimaryPrice(event);
    if (price !== undefined) {
      normalized.price = price;
    }
    if (currency) {
      normalized.currency = currency;
    }

    const color = extractPrimaryColor(event);
    if (color) {
      normalized.color = color;
    }
  }

  return Object.freeze([Object.freeze(normalized)]);
}
