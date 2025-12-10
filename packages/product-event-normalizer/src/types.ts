import { z } from 'zod';

import { ProductIdsSchema } from '@rr/shared/types';

/**
 * Toolbar offer price schema (nested price object)
 * Real data format: { "price": { "amount": "299.99", "currency": "USD" } }
 */
export const ToolbarOfferPriceSchema = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
});

/**
 * Toolbar offer schema (from browser extensions)
 * Supports both flat price (number) and nested price object formats
 */
export const ToolbarOfferSchema = z.object({
  // Price can be flat number or nested object
  price: z.union([z.number(), ToolbarOfferPriceSchema]).optional(),
  sku: z.string().optional(),
  url: z.string().optional(),
});

export type ToolbarOffer = z.infer<typeof ToolbarOfferSchema>;

/**
 * App offer schema (from mobile apps)
 * Uses: offer_amount, offer_currency, offer_sku
 * Note: offer_amount can be string or number in real data
 */
export const AppOfferSchema = z.object({
  offer_amount: z.union([z.string(), z.number()]).optional(),
  offer_currency: z.string().optional(),
  offer_sku: z.string().optional(),
});

export type AppOffer = z.infer<typeof AppOfferSchema>;

/**
 * Helper to create a flexible schema that accepts both single value and array
 * Returns the value as-is (normalizer handles extraction)
 */
const stringOrArray = z.union([z.string(), z.array(z.string())]);
const numberOrStringOrArray = z.union([
  z.number(),
  z.string(),
  z.array(z.union([z.string(), z.number()])),
]);

/**
 * Raw product view event from apps/extensions
 * Supports both Toolbar and App field naming conventions
 *
 * IMPORTANT: Toolbar events often use arrays even for single values.
 * Examples from real data:
 *   - name: ["HP Laptop 17t-cn300"] (array of 1)
 *   - brand: ["HP"] (array of 1)
 *   - url: ["https://..."] (array with multiple variant URLs)
 *   - image: ["https://..."] (array with multiple variant images)
 *
 * The normalizer extracts first value for shared fields (name, brand, description)
 * and preserves arrays for variant-specific fields (url, image, color, price).
 */
export const RawProductViewEventSchema = z.object({
  // Store identification - can be string (App) or number (Toolbar)
  store_id: z.union([z.string(), z.number()]).optional(),
  store_name: z.string().optional(),

  // Product identification - can be string OR array (Toolbar uses arrays)
  name: stringOrArray.optional(),
  url: stringOrArray.optional(),
  product_url: z.string().optional(),

  // Image - multiple formats supported
  // Toolbar: image (array), App: image_url (string) or image_url_list (array)
  image: z.array(z.string()).optional(),
  image_url: z.string().optional(),
  image_url_list: z.array(z.string()).optional(),

  // Product identifiers - DUAL FORMAT SUPPORT
  // Both singular and _list formats are supported and COMBINED when both present.
  // This is because:
  // - Platform differences: Toolbar uses singular (sku), App uses list (sku_list)
  // - Historical data: Snowflake data may contain either format depending on capture date
  // - Data capture evolution: The capture layer has changed over time
  sku: z.array(z.string()).optional(),
  sku_list: z.array(z.string()).optional(),
  gtin: z.array(z.string()).optional(),
  gtin_list: z.array(z.string()).optional(),
  productID: z.array(z.string()).optional(),
  productid_list: z.array(z.string()).optional(),
  mpn: z.array(z.string()).optional(),
  mpn_list: z.array(z.string()).optional(),
  model: z.array(z.string()).optional(),
  model_list: z.array(z.string()).optional(),

  // Offers - Toolbar uses offers array, App uses offer_list
  offers: z.array(ToolbarOfferSchema).optional(),
  offer_list: z.array(AppOfferSchema).optional(),

  // SKU correlation maps (Toolbar only)
  // Note: Values can be string OR array of strings in real data
  urlToSku: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  priceToSku: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),

  // Price arrays (Toolbar format) - for variant-level prices
  price: z
    .array(
      z.union([
        z.number(),
        z.string(),
        z.object({
          amount: z.union([z.string(), z.number()]).optional(),
          currency: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  priceInCents: z.array(z.union([z.string(), z.number()])).optional(),
  priceCurrency: z.array(z.string()).optional(),

  // Rich metadata - can be string OR array (Toolbar uses arrays)
  brand: stringOrArray.optional(),
  brand_list: z.array(z.string()).optional(),
  rating: numberOrStringOrArray.optional(),
  description: stringOrArray.optional(),
  category: stringOrArray.optional(),
  breadcrumbs: stringOrArray.optional(),
  canonical: z.array(z.string()).optional(),
  color: stringOrArray.optional(),
  color_list: z.array(z.string()).optional(),

  // Source metadata (not used in normalization but validated)
  app_version: z.string().optional(),
  application_type: z.string().optional(),
  application_subtype: z.string().optional(),
  browser: z.string().optional(),
  browser_agent: z.string().optional(),
  client: z.string().optional(),
  platform: z.string().optional(),
  page_url: z.string().optional(),
  session_id: z.number().optional(),
  tenant: z.string().optional(),
  timestamp: z.number().optional(),
  toolbarid: z.number().optional(),
  tracking_ticket: z.string().optional(),

  // App-specific fields
  member_guid: z.string().optional(),
  user_id: z.string().optional(),
  visit_id: z.string().optional(),
  device_platform: z.string().optional(),
  os_version: z.string().optional(),
  created_ts: z.string().optional(),
  created_ts_ms: z.string().optional(),

  // Device context (App only)
  context_device: z
    .object({
      id: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
      adTrackingEnabled: z.boolean().optional(),
      advertisingId: z.string().optional(),
    })
    .optional(),
  context_location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
  context_network: z
    .object({
      carrier: z.string().optional(),
      cellular: z.boolean().optional(),
      wifi: z.boolean().optional(),
      bluetooth: z.boolean().optional(),
    })
    .optional(),
  context_os: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  context_timezone: z.string().optional(),
  device_ids: z.record(z.string(), z.string()).optional(),
  app_install_ts: z.number().optional(),
});

export type RawProductViewEvent = z.infer<typeof RawProductViewEventSchema>;

/**
 * Product variant schema - variant-specific data that differs between variants
 * Used for joining cart items (which have specific variant) to product data
 *
 * Each variant represents a unique combination of attributes (size, color, etc.)
 * that has its own SKU, URL, price, and potentially image.
 */
export const ProductVariantSchema = z.object({
  /**
   * Variant SKU - unique identifier for this specific variant
   * This is the key field for joining cart items to product variants
   */
  sku: z.string(),

  /**
   * Variant-specific URL (if different from parent product URL)
   */
  url: z.string().optional(),

  /**
   * Variant-specific image URL
   */
  imageUrl: z.string().optional(),

  /**
   * Variant-specific price in cents
   */
  price: z.number().optional(),

  /**
   * Currency code for the price
   */
  currency: z.string().optional(),

  /**
   * Variant color (if this variant is a color option)
   */
  color: z.string().optional(),

  /**
   * Extracted IDs from variant URL (for joining with cart data)
   */
  extractedIds: z.array(z.string()).readonly().optional(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

/**
 * Normalized product output with variant support
 *
 * Structure separates:
 * - Shared product-level data (title, brand, description, rating, category)
 * - Aggregated identifiers in `ids` (productIds, extractedIds, all SKUs, GTINs, MPNs)
 * - Variant-specific data in `variants` array (sku, url, image, price, color)
 *
 * This enables joining cart items (which have specific SKU/URL) to the right variant
 * while inheriting shared product metadata.
 */
export const NormalizedProductSchema = z.object({
  // ========== SHARED PRODUCT-LEVEL DATA ==========
  // These are the same across all variants

  /**
   * Product title/name (first value if array in source)
   */
  title: z.string().optional(),

  /**
   * Primary product URL (canonical or first URL)
   */
  url: z.string().optional(),

  /**
   * Primary product image URL
   */
  imageUrl: z.string().optional(),

  /**
   * Rakuten store ID
   */
  storeId: z.string().optional(),

  /**
   * Store name
   */
  storeName: z.string().optional(),

  /**
   * Product brand
   */
  brand: z.string().optional(),

  /**
   * Product description
   */
  description: z.string().optional(),

  /**
   * Product category or breadcrumbs
   */
  category: z.string().optional(),

  /**
   * Product rating (typically 0-5)
   */
  rating: z.number().optional(),

  /**
   * Canonical URL (if provided separately)
   */
  canonicalUrl: z.string().optional(),

  // ========== AGGREGATED IDENTIFIERS ==========
  // All identifiers collected from the product page

  /**
   * All product identifiers grouped by type
   */
  ids: ProductIdsSchema,

  // ========== VARIANT-SPECIFIC DATA ==========
  // Per-variant data for joining with cart items

  /**
   * Array of product variants with variant-specific data
   * Each variant has its own SKU, URL, price, image, color
   * Empty array if no variant data available
   */
  variants: z.array(ProductVariantSchema).readonly(),

  /**
   * Number of variants detected
   */
  variantCount: z.number().int().min(0),

  /**
   * Whether this product has multiple variants
   */
  hasVariants: z.boolean(),

  // ========== LEGACY FIELDS (for backwards compatibility) ==========
  // Primary/default variant price - useful for single-variant products
  // or when a default price is needed

  /**
   * Primary price in cents (from first offer/variant)
   */
  price: z.number().optional(),

  /**
   * Primary currency code
   */
  currency: z.string().optional(),

  /**
   * Primary color (from first variant with color)
   */
  color: z.string().optional(),
});

export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>;

/**
 * Options for normalizeProductViewEvent
 */
export interface NormalizeProductViewEventOptions {
  /**
   * Whether to validate input with Zod schema
   * @default false in production, true in development
   */
  validate?: boolean;

  /**
   * Whether to extract product IDs from URLs as fallback
   * @default true
   */
  extractProductIds?: boolean;

  /**
   * Whether to include extended metadata fields (brand, category, etc.)
   * @default true
   */
  includeMetadata?: boolean;
}
