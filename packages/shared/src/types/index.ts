import { z } from 'zod';

/**
 * Product identifiers schema
 * Groups all product identifier types in a single nested object
 *
 * This structure is shared between cart-event-normalizer and product-event-normalizer
 * to ensure consistent output format across all normalized products.
 */
export const ProductIdsSchema = z.object({
  /**
   * Product identifiers from schema.org productID field
   * This is the specific productID/productid_list value from JSON-LD or microdata
   * Examples: "pimprod2053445", "1162031"
   * Cart events do not provide this data, so this will be empty for cart events
   * Always present, may be empty array
   */
  productIds: z.array(z.string()).readonly(),

  /**
   * Product identifiers extracted from URLs using regex patterns
   * These are derived from URL path/query parameters and may not be authoritative product IDs
   * Always present, may be empty array
   */
  extractedIds: z.array(z.string()).readonly(),

  /**
   * SKU identifiers from schema.org data
   * Collected from sku, sku_list, offers[].sku, offer_list[].offer_sku, urlToSku, priceToSku
   * Cart events do not provide this data
   * Optional, only present if SKUs were found
   */
  skus: z.array(z.string()).readonly().optional(),

  /**
   * GTIN identifiers (UPC, EAN, ISBN) from schema.org data
   * Collected from gtin, gtin_list
   * Cart events do not provide this data
   * Optional, only present if GTINs were found
   */
  gtins: z.array(z.string()).readonly().optional(),

  /**
   * MPN (Manufacturer Part Number) identifiers from schema.org data
   * Collected from mpn, mpn_list
   * Cart events do not provide this data
   * Optional, only present if MPNs were found
   */
  mpns: z.array(z.string()).readonly().optional(),
});

export type ProductIds = z.infer<typeof ProductIdsSchema>;

/**
 * Base normalized product schema
 * Shared between cart-event-normalizer and product-event-normalizer
 *
 * This defines the core fields that ALL normalized products must have.
 * Package-specific normalizers can extend this with additional fields.
 */
export const BaseNormalizedProductSchema = z.object({
  /**
   * Product title/name
   */
  title: z.string().optional(),

  /**
   * Product URL
   */
  url: z.string().optional(),

  /**
   * Product image URL
   */
  imageUrl: z.string().optional(),

  /**
   * Rakuten store ID (coerced to string)
   */
  storeId: z.string().optional(),

  /**
   * Product price (in cents or smallest currency unit)
   */
  price: z.number().optional(),

  /**
   * Product brand name
   * Available from product view events, typically not available from cart events
   */
  brand: z.string().optional(),

  /**
   * Product description
   * Available from product view events, typically not available from cart events
   */
  description: z.string().optional(),

  /**
   * All product identifiers grouped in a single object
   * Provides clean separation between product data and identifier data
   */
  ids: ProductIdsSchema,
});

export type BaseNormalizedProduct = z.infer<typeof BaseNormalizedProductSchema>;

/**
 * Type guard to check if an object is a BaseNormalizedProduct
 */
export function isBaseNormalizedProduct(obj: unknown): obj is BaseNormalizedProduct {
  return BaseNormalizedProductSchema.safeParse(obj).success;
}
