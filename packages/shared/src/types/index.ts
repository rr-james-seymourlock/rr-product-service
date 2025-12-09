import { z } from 'zod';

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
   * Consolidated product identifiers (SKUs, GTINs, MPNs, etc.)
   * Always present, may be empty array
   */
  productIds: z.array(z.string()).readonly(),
});

export type BaseNormalizedProduct = z.infer<typeof BaseNormalizedProductSchema>;

/**
 * Type guard to check if an object is a BaseNormalizedProduct
 */
export function isBaseNormalizedProduct(obj: unknown): obj is BaseNormalizedProduct {
  return BaseNormalizedProductSchema.safeParse(obj).success;
}
