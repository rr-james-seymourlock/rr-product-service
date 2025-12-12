import { distance as levenshteinDistance } from 'fastest-levenshtein';

import type { CartProduct } from '@rr/cart-event-normalizer/types';
import type { NormalizedProduct, ProductVariant } from '@rr/product-event-normalizer/types';
import type { ProductIds } from '@rr/shared/types';

import type {
  EnrichCartOptions,
  EnrichedCart,
  EnrichedCartItem,
  EnrichmentSummary,
  FieldSources,
  MatchConfidence,
  MatchMethod,
  MatchMethodNonNull,
  MatchedSignal,
  MatchedVariant,
} from './types.js';

// Pre-frozen empty arrays for performance
const EMPTY_FROZEN_STRING_ARRAY: readonly string[] = Object.freeze([]);

/**
 * Single match signal from one strategy
 */
interface StrategyMatch {
  product: NormalizedProduct;
  variant: ProductVariant | null;
  confidence: MatchConfidence;
  method: MatchMethodNonNull;
  /** Whether this was an exact match (true) or fuzzy/within tolerance (false) */
  exact: boolean;
}

/**
 * Match result from matching a cart item to a product
 * Contains all matching signals, with the primary (highest confidence) match as the main result
 */
interface MatchResult {
  product: NormalizedProduct | null;
  variant: ProductVariant | null;
  confidence: MatchConfidence;
  method: MatchMethod;
  /** All matching signals found, sorted by confidence (high → low) */
  matchedSignals: MatchedSignal[];
}

/**
 * Confidence level ordering for comparison
 */
const CONFIDENCE_ORDER: Record<MatchConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/**
 * Check if confidence meets minimum threshold
 */
function meetsThreshold(confidence: MatchConfidence, minConfidence: MatchConfidence): boolean {
  return CONFIDENCE_ORDER[confidence] >= CONFIDENCE_ORDER[minConfidence];
}

/**
 * Check if two arrays have any common elements
 */
function hasIntersection(arr1: readonly string[], arr2: readonly string[]): boolean {
  if (arr1.length === 0 || arr2.length === 0) return false;

  // Use Set for O(n) lookup when arrays are larger
  if (arr1.length + arr2.length > 10) {
    const set = new Set(arr1);
    return arr2.some((item) => set.has(item));
  }

  // Linear scan for small arrays
  return arr1.some((item) => arr2.includes(item));
}

/**
 * Normalize URL for comparison (remove trailing slashes, lowercase)
 */
function normalizeUrl(url: string | undefined): string {
  if (!url) return '';
  return url.toLowerCase().replace(/\/+$/, '');
}

/**
 * Extract potential SKUs from image URLs
 * Many stores embed SKUs in image filenames (e.g., "SportCapGSWhiteI3A6W-WB5795051.jpg")
 *
 * Pattern matches uppercase alphanumeric codes (typically 4-10 chars) that are:
 * - Preceded by a non-alphanumeric char or start of string
 * - Followed by a non-alphanumeric char (often hyphen, underscore, or dot)
 */
function extractSkusFromImageUrl(imageUrl: string | undefined): string[] {
  if (!imageUrl) return [];

  // Get just the filename part (after last /)
  const filename = imageUrl.split('/').pop() ?? '';

  // Look for uppercase alphanumeric codes that look like SKUs
  // Pattern: 4-10 uppercase chars/numbers, typically followed by hyphen or underscore
  // Examples: I3A6W, A2A4H, A3B9Y, A2A1J
  const skuPattern = /([A-Z][A-Z0-9]{3,9})(?=[-_.])/g;
  const matches: string[] = [];

  let match;
  while ((match = skuPattern.exec(filename)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }

  return matches;
}

/**
 * Parse a cart title to extract base name and color/variant suffix
 * Common patterns:
 * - "Sport Cap - White" → { base: "Sport Cap", color: "White" }
 * - "Arrival T-Shirt - Black" → { base: "Arrival T-Shirt", color: "Black" }
 * - "Champion Boys Logo Jogger Grey M:- Grey, M" → { base: "Champion Boys Logo Jogger", color: "Grey M" }
 * - "Sport Cap" → { base: "Sport Cap", color: undefined }
 */
function parseCartTitle(title: string | undefined): { base: string; color: string | undefined } {
  if (!title) return { base: '', color: undefined };

  // Pattern 1: Sam's Club format "Title Color Size:- Color, Size"
  // The ":- " separator with variant info after it
  const samsClubPattern = /^(.+?)\s+([A-Za-z]+(?:\s+[A-Z0-9]+)?)\s*:-\s*.+$/;
  const samsClubMatch = title.match(samsClubPattern);
  if (samsClubMatch && samsClubMatch[1] && samsClubMatch[2]) {
    return { base: samsClubMatch[1].trim(), color: samsClubMatch[2].trim() };
  }

  // Pattern 2: Common separators: " - ", " – " (en dash), " — " (em dash)
  const separatorPattern = /\s+[-–—]\s+/;
  const parts = title.split(separatorPattern);

  if (parts.length >= 2) {
    // Last part is likely the color/variant
    const color = parts.pop()?.trim();
    const base = parts.join(' - ').trim();
    return { base, color };
  }

  return { base: title.trim(), color: undefined };
}

/**
 * Normalize a string for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeForComparison(s: string | undefined): string {
  if (!s) return '';
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalize title for similarity comparison
 * - Lowercase
 * - Remove punctuation except hyphens within words
 * - Collapse whitespace
 */
function normalizeTitleForSimilarity(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a normalized string into words
 */
function tokenize(s: string): string[] {
  return s.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Calculate Dice coefficient on sets
 */
function diceCoefficient<T>(set1: Set<T>, set2: Set<T>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionCount++;
    }
  }

  return (2 * intersectionCount) / (set1.size + set2.size);
}

/**
 * Generate bigrams from a string
 */
function getBigrams(s: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculate Levenshtein similarity (normalized to 0-1)
 * Uses fastest-levenshtein for edit distance calculation
 */
function calculateLevenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);

  // Normalize: 1 - (distance / maxLen) gives us 0-1 similarity
  return 1 - distance / maxLen;
}

/**
 * Calculate title similarity using multiple strategies:
 * 1. Exact match (returns 1.0)
 * 2. Containment check - if shorter title is fully contained in longer (returns 0.95)
 * 3. Token-based Dice coefficient - word-level comparison
 * 4. Bigram-based Dice coefficient - character n-gram comparison
 * 5. Levenshtein similarity - edit distance (good for typo detection)
 *
 * Returns the maximum of the strategies (0-1)
 */
function calculateTitleSimilarity(title1: string | undefined, title2: string | undefined): number {
  if (!title1 || !title2) return 0;

  const t1 = normalizeTitleForSimilarity(title1);
  const t2 = normalizeTitleForSimilarity(title2);

  // Exact match
  if (t1 === t2) return 1;
  if (t1.length === 0 || t2.length === 0) return 0;

  // Containment check: if one title fully contains the other
  // This handles cases like "Sport Cap" vs "Sport Cap - White"
  const shorter = t1.length <= t2.length ? t1 : t2;
  const longer = t1.length > t2.length ? t1 : t2;

  // Check if shorter is a prefix or standalone word sequence in longer
  if (longer.startsWith(shorter + ' ') || longer === shorter) {
    // The longer title starts with the shorter title followed by more content
    // This is a strong signal of a match with variant info appended
    return 0.95;
  }

  // Token-based Dice coefficient (word-level)
  const tokens1 = new Set(tokenize(t1));
  const tokens2 = new Set(tokenize(t2));
  const tokenDice = diceCoefficient(tokens1, tokens2);

  // Bigram-based Dice coefficient (character-level)
  const bigrams1 = getBigrams(t1);
  const bigrams2 = getBigrams(t2);
  const bigramDice = diceCoefficient(bigrams1, bigrams2);

  // Levenshtein similarity - good for detecting typos and near-exact matches
  const levenSimilarity = calculateLevenshteinSimilarity(t1, t2);

  // Return the highest score from all strategies
  // - Token Dice: best for word-level variations (word order, extra words)
  // - Bigram Dice: best for partial matches and some typos
  // - Levenshtein: best for character-level typos and near-exact matches
  return Math.max(tokenDice, bigramDice, levenSimilarity);
}

/**
 * Try to match a cart item to products using SKU
 */
function trySkuMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  const cartSkus = cartItem.ids.skus ?? [];
  if (cartSkus.length === 0) return null;

  for (const product of products) {
    const productSkus = product.ids.skus ?? [];
    if (hasIntersection(cartSkus, productSkus)) {
      return {
        product,
        variant: null,
        confidence: 'high',
        method: 'sku',
        exact: true, // SKU matching is always exact string equality
      };
    }
  }

  return null;
}

/**
 * Try to match a cart item to product variants using SKU
 */
function tryVariantSkuMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  const cartSkus = cartItem.ids.skus ?? [];
  if (cartSkus.length === 0) return null;

  for (const product of products) {
    for (const variant of product.variants) {
      if (cartSkus.includes(variant.sku)) {
        return {
          product,
          variant,
          confidence: 'high',
          method: 'variant_sku',
          exact: true, // Variant SKU matching is always exact string equality
        };
      }
    }
  }

  return null;
}

/**
 * Try to match a cart item to products using SKU extracted from image URL
 * This is useful when cart items don't have product URLs but have image URLs with embedded SKUs
 */
function tryImageSkuMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  const imageSkus = extractSkusFromImageUrl(cartItem.imageUrl);
  if (imageSkus.length === 0) return null;

  for (const product of products) {
    const productSkus = product.ids.skus ?? [];
    if (hasIntersection(imageSkus, productSkus)) {
      return {
        product,
        variant: null,
        confidence: 'high',
        method: 'image_sku',
        exact: true, // Image SKU matching is exact string equality
      };
    }
  }

  return null;
}

/**
 * Try to match a cart item to products using URL
 */
function tryUrlMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  const cartUrl = normalizeUrl(cartItem.url);
  if (!cartUrl) return null;

  for (const product of products) {
    // Check main product URL
    if (normalizeUrl(product.url) === cartUrl) {
      return {
        product,
        variant: null,
        confidence: 'medium',
        method: 'url',
        exact: true, // Normalized URL matching is exact string equality
      };
    }

    // Check variant URLs
    for (const variant of product.variants) {
      if (normalizeUrl(variant.url) === cartUrl) {
        return {
          product,
          variant,
          confidence: 'medium',
          method: 'url',
          exact: true, // Normalized URL matching is exact string equality
        };
      }
    }
  }

  return null;
}

/**
 * Try to match a cart item to products using extracted IDs
 */
function tryExtractedIdMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  const cartIds = cartItem.ids.extractedIds;
  if (cartIds.length === 0) return null;

  for (const product of products) {
    // Check main product extractedIds
    if (hasIntersection(cartIds, product.ids.extractedIds)) {
      return {
        product,
        variant: null,
        confidence: 'medium',
        method: 'extracted_id',
        exact: true, // Extracted ID matching is exact string equality
      };
    }

    // Check variant extractedIds
    for (const variant of product.variants) {
      const variantIds = variant.extractedIds ?? [];
      if (hasIntersection(cartIds, variantIds)) {
        return {
          product,
          variant,
          confidence: 'medium',
          method: 'extracted_id',
          exact: true, // Extracted ID matching is exact string equality
        };
      }
    }
  }

  return null;
}

/**
 * Try to match a cart item to products using cart extracted IDs against product SKUs
 * This handles cases where the URL contains a SKU-like ID (extractedId) that matches
 * a SKU in the product's variant list.
 *
 * Example: Cart URL has pid=7873200220004, product view has 7873200220004 in its skus array
 * (even though the product view was for a different variant like pid=7873200220003)
 *
 * Returns high confidence since extractedIds from URLs are typically SKU-equivalent identifiers.
 */
function tryExtractedIdToSkuMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  const cartIds = cartItem.ids.extractedIds;
  if (cartIds.length === 0) return null;

  for (const product of products) {
    // Check if cart extractedId matches any product SKU
    const productSkus = product.ids.skus ?? [];
    if (hasIntersection(cartIds, productSkus)) {
      return {
        product,
        variant: null,
        confidence: 'high',
        method: 'extracted_id_sku',
        exact: true, // Extracted ID to SKU matching is exact string equality
      };
    }

    // Also check variant SKUs
    for (const variant of product.variants) {
      if (cartIds.includes(variant.sku)) {
        return {
          product,
          variant,
          confidence: 'high',
          method: 'extracted_id_sku',
          exact: true,
        };
      }
    }
  }

  return null;
}

/**
 * Try to match a cart item to products using title + color combination
 * This handles cases where cart titles have color appended (e.g., "Sport Cap - White")
 * and products have separate title ("Sport Cap") and color ("White") fields.
 *
 * Returns medium confidence since it requires exact title + color match.
 */
function tryTitleColorMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
): StrategyMatch | null {
  if (!cartItem.title) return null;

  const { base: cartBase, color: cartColor } = parseCartTitle(cartItem.title);

  // Need both base title and color to use this strategy
  if (!cartBase || !cartColor) return null;

  const normalizedCartBase = normalizeForComparison(cartBase);
  const normalizedCartColor = normalizeForComparison(cartColor);

  for (const product of products) {
    const normalizedProductTitle = normalizeForComparison(product.title);

    // Check if base titles match
    if (normalizedProductTitle !== normalizedCartBase) continue;

    // Check product-level color
    if (product.color && normalizeForComparison(product.color) === normalizedCartColor) {
      return {
        product,
        variant: null,
        confidence: 'medium',
        method: 'title_color',
        exact: true, // Normalized title+color matching is exact string equality
      };
    }

    // Check variant colors
    for (const variant of product.variants) {
      if (variant.color && normalizeForComparison(variant.color) === normalizedCartColor) {
        return {
          product,
          variant,
          confidence: 'medium',
          method: 'title_color',
          exact: true, // Normalized title+color matching is exact string equality
        };
      }
    }
  }

  return null;
}

/**
 * Try to match a cart item to products using title similarity
 */
function tryTitleMatch(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
  threshold: number,
): StrategyMatch | null {
  if (!cartItem.title) return null;

  let bestMatch: { product: NormalizedProduct; similarity: number } | null = null;

  for (const product of products) {
    const similarity = calculateTitleSimilarity(cartItem.title, product.title);
    if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { product, similarity };
    }
  }

  if (bestMatch) {
    return {
      product: bestMatch.product,
      variant: null,
      confidence: 'low',
      method: 'title',
      exact: false, // Title matching uses fuzzy similarity, never exact
    };
  }

  return null;
}

/**
 * Default price tolerance - 10% to account for tax, discounts, rounding
 */
const DEFAULT_PRICE_TOLERANCE = 0.1;

/**
 * Check if two prices match within a tolerance
 * Handles tax variations, rounding, and minor price differences
 *
 * @param price1 - First price in cents
 * @param price2 - Second price in cents
 * @param tolerance - Tolerance as decimal (0.1 = 10%)
 * @returns true if prices match within tolerance
 */
function pricesMatch(
  price1: number | undefined,
  price2: number | undefined,
  tolerance: number = DEFAULT_PRICE_TOLERANCE,
): boolean {
  if (price1 === undefined || price2 === undefined) return false;
  if (price1 === price2) return true;
  if (price1 === 0 || price2 === 0) return false;

  // Calculate percentage difference relative to the higher price
  const maxPrice = Math.max(price1, price2);
  const diff = Math.abs(price1 - price2);
  const percentDiff = diff / maxPrice;

  return percentDiff <= tolerance;
}

/**
 * Try to match a cart item to a specific product using price
 * This is a SUPPORTING signal only - never used as primary match
 * Returns low confidence since price alone is not definitive
 *
 * Checks:
 * 1. Cart price vs product base price
 * 2. Cart price vs variant prices
 */
function tryPriceMatch(cartItem: CartProduct, product: NormalizedProduct): StrategyMatch | null {
  if (cartItem.price === undefined) return null;

  // Check main product price
  if (pricesMatch(cartItem.price, product.price)) {
    const isExactPrice = cartItem.price === product.price;
    return {
      product,
      variant: null,
      confidence: 'low',
      method: 'price',
      exact: isExactPrice, // true if identical, false if within tolerance
    };
  }

  // Check variant prices
  for (const variant of product.variants) {
    if (pricesMatch(cartItem.price, variant.price)) {
      const isExactPrice = cartItem.price === variant.price;
      return {
        product,
        variant,
        confidence: 'low',
        method: 'price',
        exact: isExactPrice, // true if identical, false if within tolerance
      };
    }
  }

  return null;
}

/**
 * Match a cart item to products using multi-strategy approach
 * Runs ALL strategies and collects all matching signals.
 * Primary match is the highest confidence match.
 *
 * Strategies (in order of confidence):
 * - SKU, variant_sku, image_sku: high confidence
 * - URL, extracted_id, title_color: medium confidence
 * - title: low confidence
 * - price: low confidence (supporting signal only, added when product is already matched)
 */
function matchCartItem(
  cartItem: CartProduct,
  products: readonly NormalizedProduct[],
  titleThreshold: number,
): MatchResult {
  // Run all strategies and collect all matches
  const strategies: Array<{ fn: () => StrategyMatch | null }> = [
    { fn: () => trySkuMatch(cartItem, products) },
    { fn: () => tryVariantSkuMatch(cartItem, products) },
    { fn: () => tryImageSkuMatch(cartItem, products) },
    { fn: () => tryExtractedIdToSkuMatch(cartItem, products) }, // High confidence: cart extractedId matches product SKU
    { fn: () => tryUrlMatch(cartItem, products) },
    { fn: () => tryExtractedIdMatch(cartItem, products) },
    { fn: () => tryTitleColorMatch(cartItem, products) },
    { fn: () => tryTitleMatch(cartItem, products, titleThreshold) },
  ];

  const allMatches: StrategyMatch[] = [];

  for (const { fn } of strategies) {
    const match = fn();
    if (match) {
      allMatches.push(match);
    }
  }

  // No matches found
  if (allMatches.length === 0) {
    return {
      product: null,
      variant: null,
      confidence: 'none',
      method: null,
      matchedSignals: [],
    };
  }

  // Sort by confidence (high → medium → low) and use first as primary
  allMatches.sort((a, b) => CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence]);

  // Primary is guaranteed to exist since we checked allMatches.length > 0
  const primary = allMatches[0]!;

  // Build matchedSignals array from all matches
  const matchedSignals: MatchedSignal[] = allMatches.map((m) => ({
    method: m.method,
    confidence: m.confidence,
    exact: m.exact,
  }));

  // Add price as a supporting signal if we have a match and price matches
  // Price is never a primary match method, only a confirming signal
  if (primary.product) {
    const priceMatch = tryPriceMatch(cartItem, primary.product);
    if (priceMatch) {
      // Only add if not already present (shouldn't happen, but defensive)
      const hasPriceSignal = matchedSignals.some((s) => s.method === 'price');
      if (!hasPriceSignal) {
        matchedSignals.push({
          method: 'price',
          confidence: 'low',
          exact: priceMatch.exact,
        });
      }
    }
  }

  return {
    product: primary.product,
    variant: primary.variant,
    confidence: primary.confidence,
    method: primary.method,
    matchedSignals,
  };
}

/**
 * Merge product IDs from cart and product
 */
function mergeProductIds(cartIds: ProductIds, productIds: ProductIds | undefined): ProductIds {
  if (!productIds) {
    return cartIds;
  }

  // Merge and deduplicate all ID arrays
  const mergeArrays = (
    arr1: readonly string[],
    arr2: readonly string[] | undefined,
  ): readonly string[] => {
    if (!arr2 || arr2.length === 0) return arr1;
    if (arr1.length === 0) return arr2;
    return Object.freeze([...new Set([...arr1, ...arr2])]);
  };

  return Object.freeze({
    productIds: mergeArrays(cartIds.productIds, productIds.productIds),
    extractedIds: mergeArrays(cartIds.extractedIds, productIds.extractedIds),
    skus: mergeArrays(cartIds.skus ?? EMPTY_FROZEN_STRING_ARRAY, productIds.skus),
    gtins: mergeArrays(cartIds.gtins ?? EMPTY_FROZEN_STRING_ARRAY, productIds.gtins),
    mpns: mergeArrays(cartIds.mpns ?? EMPTY_FROZEN_STRING_ARRAY, productIds.mpns),
  });
}

/**
 * Create an enriched cart item from a cart item and optional product match
 */
function createEnrichedItem(
  cartItem: CartProduct,
  matchResult: MatchResult,
  minConfidence: MatchConfidence,
  enrichedAt: string,
): EnrichedCartItem {
  const { product, variant, confidence, method, matchedSignals } = matchResult;

  // Check if match meets confidence threshold
  const matchMeetsThreshold = meetsThreshold(confidence, minConfidence);
  const effectiveProduct = matchMeetsThreshold ? product : null;
  const effectiveVariant = matchMeetsThreshold ? variant : null;
  const wasViewed = effectiveProduct !== null;

  // Build field sources tracking
  const sources: FieldSources = {};

  // Merge fields with precedence (cart > product for shared fields)
  const title = cartItem.title ?? effectiveProduct?.title;
  sources.title = cartItem.title ? 'cart' : effectiveProduct?.title ? 'product' : undefined;

  const url = cartItem.url ?? effectiveProduct?.url;
  sources.url = cartItem.url ? 'cart' : effectiveProduct?.url ? 'product' : undefined;

  const imageUrl = cartItem.imageUrl ?? effectiveVariant?.imageUrl ?? effectiveProduct?.imageUrl;
  sources.imageUrl = cartItem.imageUrl
    ? 'cart'
    : effectiveVariant?.imageUrl || effectiveProduct?.imageUrl
      ? 'product'
      : undefined;

  // Price from cart (what user saw)
  const price = cartItem.price;
  sources.price = price !== undefined ? 'cart' : undefined;

  // Product-specific fields from product view
  const brand = effectiveProduct?.brand;
  const description = effectiveProduct?.description;
  const category = effectiveProduct?.category;
  const rating = effectiveProduct?.rating;
  const currency = effectiveProduct?.currency ?? effectiveVariant?.currency;

  if (brand) sources.brand = 'product';
  if (description) sources.description = 'product';
  if (category) sources.category = 'product';
  if (rating !== undefined) sources.rating = 'product';

  // Merge IDs from both sources
  const ids = effectiveProduct ? mergeProductIds(cartItem.ids, effectiveProduct.ids) : cartItem.ids;
  sources.ids = effectiveProduct ? 'merged' : 'cart';

  // Build matched variant data if variant match occurred
  let matchedVariant: MatchedVariant | undefined;
  if (effectiveVariant) {
    matchedVariant = {
      sku: effectiveVariant.sku,
      url: effectiveVariant.url,
      imageUrl: effectiveVariant.imageUrl,
      price: effectiveVariant.price,
      currency: effectiveVariant.currency,
      color: effectiveVariant.color,
    };
  }

  const enrichedItem: EnrichedCartItem = {
    title,
    url,
    imageUrl,
    storeId: cartItem.storeId,
    price,
    currency,
    brand,
    description,
    category,
    rating,
    quantity: cartItem.quantity,
    lineTotal: cartItem.lineTotal,
    ids,
    inCart: true,
    wasViewed,
    matchConfidence: wasViewed ? confidence : 'none',
    matchMethod: wasViewed ? method : null,
    matchedSignals: wasViewed ? matchedSignals : [],
    enrichedAt,
    sources: Object.freeze(sources),
    matchedVariant,
  };

  return Object.freeze(enrichedItem);
}

/**
 * Calculate enrichment summary statistics
 */
function calculateSummary(items: readonly EnrichedCartItem[]): EnrichmentSummary {
  const totalItems = items.length;
  const matchedItems = items.filter((item) => item.wasViewed).length;
  const unmatchedItems = totalItems - matchedItems;
  const matchRate = totalItems > 0 ? (matchedItems / totalItems) * 100 : 0;

  const byConfidence = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };

  const byMethod = {
    sku: 0,
    variant_sku: 0,
    image_sku: 0,
    url: 0,
    extracted_id: 0,
    extracted_id_sku: 0,
    title_color: 0,
    title: 0,
    price: 0,
  };

  for (const item of items) {
    byConfidence[item.matchConfidence]++;
    if (item.matchMethod) {
      byMethod[item.matchMethod]++;
    }
  }

  return Object.freeze({
    totalItems,
    matchedItems,
    unmatchedItems,
    matchRate,
    byConfidence: Object.freeze(byConfidence),
    byMethod: Object.freeze(byMethod),
  });
}

/**
 * Enrich cart items with product view data
 *
 * Takes a normalized cart (array of CartProduct) and array of normalized products
 * from the same store, matches items using multiple strategies, and outputs
 * enriched items with combined data.
 *
 * Matching strategies (in order of confidence):
 * 1. SKU match (high confidence) - cart.ids.skus ∩ product.ids.skus
 * 2. Variant SKU match (high confidence) - cart.ids.skus ∩ product.variants[].sku
 * 3. Image SKU match (high confidence) - SKU extracted from cart.imageUrl ∩ product.ids.skus
 * 4. URL match (medium confidence) - normalized URL comparison
 * 5. Extracted ID match (medium confidence) - cart.ids.extractedIds ∩ product.ids.extractedIds
 * 6. Title + Color match (medium confidence) - "Sport Cap - White" matches "Sport Cap" with color "White"
 * 7. Title similarity (low confidence) - Dice coefficient above threshold
 *
 * @param cartItems - Normalized cart items from @rr/cart-event-normalizer
 * @param products - Normalized products from @rr/product-event-normalizer
 * @param options - Enrichment options
 * @returns Enriched cart with combined data and summary statistics
 *
 * @example
 * ```ts
 * const enrichedCart = enrichCart(cartItems, products, { minConfidence: 'medium' });
 * console.log(enrichedCart.summary.matchRate); // 85.5
 * ```
 */
export function enrichCart(
  cartItems: readonly CartProduct[],
  products: readonly NormalizedProduct[],
  options: EnrichCartOptions = {},
): EnrichedCart {
  const { minConfidence = 'high', titleSimilarityThreshold = 0.8 } = options;

  const enrichedAt = new Date().toISOString();

  // Validate store IDs match if both have storeIds
  const cartStoreId = cartItems[0]?.storeId;
  const productStoreId = products[0]?.storeId;

  if (cartStoreId && productStoreId && cartStoreId !== productStoreId) {
    throw new Error(
      `Store ID mismatch: cart storeId "${cartStoreId}" does not match product storeId "${productStoreId}"`,
    );
  }

  // Enrich each cart item
  const enrichedItems: EnrichedCartItem[] = [];

  for (const cartItem of cartItems) {
    const matchResult = matchCartItem(cartItem, products, titleSimilarityThreshold);
    const enrichedItem = createEnrichedItem(cartItem, matchResult, minConfidence, enrichedAt);
    enrichedItems.push(enrichedItem);
  }

  const frozenItems = Object.freeze(enrichedItems);
  const summary = calculateSummary(frozenItems);

  const enrichedCart: EnrichedCart = {
    storeId: cartStoreId ?? productStoreId,
    items: frozenItems,
    summary,
    enrichedAt,
  };

  return Object.freeze(enrichedCart);
}
