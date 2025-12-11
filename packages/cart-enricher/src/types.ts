import { z } from 'zod';

import { ProductIdsSchema } from '@rr/shared/types';

/**
 * Match confidence levels for cart-to-product matching
 */
export const MatchConfidenceSchema = z.enum(['high', 'medium', 'low', 'none']);
export type MatchConfidence = z.infer<typeof MatchConfidenceSchema>;

/**
 * Match methods used for cart-to-product matching
 * - 'sku': Exact SKU match (cart.ids.skus intersects product.ids.skus)
 * - 'variant_sku': Cart SKU matches a product variant SKU
 * - 'image_sku': SKU extracted from cart image URL matches product SKU
 * - 'url': URL-based match
 * - 'extracted_id': Extracted IDs overlap
 * - 'title_color': Title + color match (cart "Sport Cap - White" matches product "Sport Cap" with color "White")
 * - 'title': Title similarity match (lowest confidence)
 * - null: No match found
 */
export const MatchMethodSchema = z
  .enum(['sku', 'variant_sku', 'image_sku', 'url', 'extracted_id', 'title_color', 'title'])
  .nullable();
export type MatchMethod = z.infer<typeof MatchMethodSchema>;

/**
 * Non-nullable version of MatchMethod for use in matchedSignals array
 */
export const MatchMethodNonNullSchema = z.enum([
  'sku',
  'variant_sku',
  'image_sku',
  'url',
  'extracted_id',
  'title_color',
  'title',
]);
export type MatchMethodNonNull = z.infer<typeof MatchMethodNonNullSchema>;

/**
 * A single matched signal representing one way the cart item matched a product
 */
export const MatchedSignalSchema = z.object({
  /**
   * The matching method that succeeded
   */
  method: MatchMethodNonNullSchema,

  /**
   * Confidence level for this particular signal
   */
  confidence: MatchConfidenceSchema,
});
export type MatchedSignal = z.infer<typeof MatchedSignalSchema>;

/**
 * Provenance tracking for merged fields
 * Tracks which source each field came from
 */
export const FieldSourceSchema = z.enum(['cart', 'product', 'merged']);
export type FieldSource = z.infer<typeof FieldSourceSchema>;

/**
 * Source tracking for individual fields in enriched items
 */
export const FieldSourcesSchema = z.object({
  title: FieldSourceSchema.optional(),
  url: FieldSourceSchema.optional(),
  imageUrl: FieldSourceSchema.optional(),
  price: FieldSourceSchema.optional(),
  brand: FieldSourceSchema.optional(),
  description: FieldSourceSchema.optional(),
  category: FieldSourceSchema.optional(),
  rating: FieldSourceSchema.optional(),
  ids: FieldSourceSchema.optional(),
});
export type FieldSources = z.infer<typeof FieldSourcesSchema>;

/**
 * Matched variant information when a variant-level match occurs
 */
export const MatchedVariantSchema = z.object({
  sku: z.string(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  color: z.string().optional(),
});
export type MatchedVariant = z.infer<typeof MatchedVariantSchema>;

/**
 * Enriched cart item - combines cart data with matched product data
 *
 * Field precedence:
 * - Cart-specific: quantity, lineTotal, cartPrice (always from cart)
 * - Product-specific: brand, category, description, rating, variants (from product when matched)
 * - Shared fields: title, url, imageUrl use cart value with product fallback
 * - Price: shows cart price (what user saw at cart time)
 * - IDs: merged from both sources
 */
export const EnrichedCartItemSchema = z.object({
  // ========== PRODUCT DATA (merged from cart + product) ==========
  /**
   * Product title (prefers cart, falls back to product)
   */
  title: z.string().optional(),

  /**
   * Product URL (prefers cart, falls back to product)
   */
  url: z.string().optional(),

  /**
   * Product image URL (prefers cart, falls back to product)
   */
  imageUrl: z.string().optional(),

  /**
   * Store ID
   */
  storeId: z.string().optional(),

  /**
   * Price in cents - cart price (what user saw at cart time)
   */
  price: z.number().optional(),

  /**
   * Currency code
   */
  currency: z.string().optional(),

  /**
   * Product brand (from product view data)
   */
  brand: z.string().optional(),

  /**
   * Product description (from product view data)
   */
  description: z.string().optional(),

  /**
   * Product category (from product view data)
   */
  category: z.string().optional(),

  /**
   * Product rating (from product view data)
   */
  rating: z.number().optional(),

  // ========== CART-SPECIFIC DATA ==========
  /**
   * Quantity of this item in the cart
   */
  quantity: z.number().optional(),

  /**
   * Line total (price * quantity)
   */
  lineTotal: z.number().optional(),

  // ========== IDENTIFIERS (merged from both sources) ==========
  /**
   * Merged product identifiers from cart and product data
   */
  ids: ProductIdsSchema,

  // ========== MATCH METADATA ==========
  /**
   * Whether this item is in the cart (always true for cart enrichment)
   */
  inCart: z.boolean(),

  /**
   * Whether this item was matched to a product view
   */
  wasViewed: z.boolean(),

  /**
   * Match confidence level
   */
  matchConfidence: MatchConfidenceSchema,

  /**
   * Method used to match cart item to product (primary/first match)
   */
  matchMethod: MatchMethodSchema,

  /**
   * All matching signals found between cart item and product
   * Contains every method that successfully matched, with confidence levels
   */
  matchedSignals: z.array(MatchedSignalSchema),

  /**
   * ISO timestamp of enrichment
   */
  enrichedAt: z.string(),

  /**
   * Provenance tracking for individual fields
   */
  sources: FieldSourcesSchema,

  /**
   * Matched variant data when variant-level match occurs
   */
  matchedVariant: MatchedVariantSchema.optional(),
});

export type EnrichedCartItem = z.infer<typeof EnrichedCartItemSchema>;

/**
 * Summary statistics for cart enrichment
 */
export const EnrichmentSummarySchema = z.object({
  /**
   * Total number of items in the cart
   */
  totalItems: z.number().int().min(0),

  /**
   * Number of items matched to product views
   */
  matchedItems: z.number().int().min(0),

  /**
   * Number of items without product view matches
   */
  unmatchedItems: z.number().int().min(0),

  /**
   * Match rate as percentage (0-100)
   */
  matchRate: z.number().min(0).max(100),

  /**
   * Breakdown by confidence level
   */
  byConfidence: z.object({
    high: z.number().int().min(0),
    medium: z.number().int().min(0),
    low: z.number().int().min(0),
    none: z.number().int().min(0),
  }),

  /**
   * Breakdown by match method
   */
  byMethod: z.object({
    sku: z.number().int().min(0),
    variant_sku: z.number().int().min(0),
    image_sku: z.number().int().min(0),
    url: z.number().int().min(0),
    extracted_id: z.number().int().min(0),
    title_color: z.number().int().min(0),
    title: z.number().int().min(0),
  }),
});

export type EnrichmentSummary = z.infer<typeof EnrichmentSummarySchema>;

/**
 * Enriched cart output - array of enriched items with summary stats
 */
export const EnrichedCartSchema = z.object({
  /**
   * Store ID for the cart
   */
  storeId: z.string().optional(),

  /**
   * Enriched cart items
   */
  items: z.array(EnrichedCartItemSchema).readonly(),

  /**
   * Summary statistics
   */
  summary: EnrichmentSummarySchema,

  /**
   * ISO timestamp of enrichment
   */
  enrichedAt: z.string(),
});

export type EnrichedCart = z.infer<typeof EnrichedCartSchema>;

/**
 * Options for enrichCart function
 */
export interface EnrichCartOptions {
  /**
   * Minimum confidence level for matches
   * Items below threshold are marked as unmatched (wasViewed=false)
   * @default 'high' (only SKU matches)
   */
  minConfidence?: MatchConfidence;

  /**
   * Enable Zod schema validation
   * @default false
   */
  validate?: boolean;

  /**
   * Title similarity threshold for fuzzy matching (0-1)
   * @default 0.8
   */
  titleSimilarityThreshold?: number;
}
