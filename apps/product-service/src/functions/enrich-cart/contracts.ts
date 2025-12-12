import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  EnrichedCartItemSchema,
  EnrichmentSummarySchema,
  MatchConfidenceSchema,
} from '@rr/cart-enricher';
import { CartProductSchema } from '@rr/cart-event-normalizer';
import { NormalizedProductSchema } from '@rr/product-event-normalizer';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * Cart product item schema with OpenAPI metadata
 */
const cartProductItemSchema = z.object(CartProductSchema.shape).openapi('CartProduct');

/**
 * Normalized product schema with OpenAPI metadata
 */
const normalizedProductItemSchema = z
  .object(NormalizedProductSchema.shape)
  .openapi('NormalizedProduct');

/**
 * Request body schema for POST /cart/enrich
 */
export const enrichCartRequestSchema = z
  .object({
    cart: z
      .array(cartProductItemSchema)
      .min(1, 'At least one cart item is required')
      .max(50, 'Maximum 50 cart items per request')
      .openapi({
        description: 'Array of normalized cart products to enrich (1-50 per request)',
        example: [
          {
            title: "Women's Cotton Sweater",
            url: 'https://macys.com/shop/product?ID=12345',
            storeId: '8333',
            price: 4900,
            quantity: 1,
            ids: {
              productIds: [],
              extractedIds: ['12345'],
            },
          },
        ],
      }),
    products: z
      .array(normalizedProductItemSchema)
      .max(50, 'Maximum 50 products per request')
      .openapi({
        description: 'Array of normalized products from product view events for matching',
        example: [
          {
            title: "Women's Cotton Sweater - Charter Club",
            url: 'https://macys.com/shop/product?ID=12345',
            storeId: '8333',
            brand: 'Charter Club',
            category: 'Sweaters',
            rating: 4.5,
            price: 4900,
            currency: 'USD',
            ids: {
              productIds: [],
              extractedIds: ['12345'],
              skus: ['12345678'],
            },
            variants: [{ sku: '12345678', price: 4900 }],
            variantCount: 1,
            hasVariants: false,
          },
        ],
      }),
    options: z
      .object({
        minConfidence: MatchConfidenceSchema.optional().openapi({
          description: 'Minimum confidence level for matches (default: high)',
          example: 'high',
        }),
        titleSimilarityThreshold: z.number().min(0).max(1).optional().openapi({
          description: 'Title similarity threshold for fuzzy matching (0-1, default: 0.8)',
          example: 0.8,
        }),
      })
      .optional()
      .openapi({
        description: 'Optional enrichment configuration',
      }),
  })
  .openapi('EnrichCartRequest');

/**
 * Enriched cart item schema with OpenAPI metadata
 */
const enrichedCartItemSchema = z.object(EnrichedCartItemSchema.shape).openapi('EnrichedCartItem');

/**
 * Enrichment summary schema with OpenAPI metadata
 */
const enrichmentSummarySchema = z
  .object(EnrichmentSummarySchema.shape)
  .openapi('EnrichmentSummary');

/**
 * Success response schema for POST /cart/enrich
 */
export const enrichCartResponseSchema = z
  .object({
    storeId: z.string().optional().openapi({
      description: 'Store ID for the enriched cart',
      example: '8333',
    }),
    items: z.array(enrichedCartItemSchema).openapi({
      description: 'Array of enriched cart items with combined data',
    }),
    summary: enrichmentSummarySchema.openapi({
      description: 'Enrichment summary statistics',
    }),
    enrichedAt: z.string().openapi({
      description: 'ISO timestamp of enrichment',
      example: '2024-12-11T12:00:00.000Z',
    }),
    durationMs: z.number().int().min(0).openapi({
      description: 'Processing time in milliseconds',
      example: 15,
    }),
  })
  .openapi('EnrichCartResponse');

/**
 * Error response schema
 */
export const errorResponseSchema = z
  .object({
    error: z.string().min(1).openapi({
      description: 'Error type/code',
      example: 'ValidationError',
    }),
    message: z.string().min(1).openapi({
      description: 'Human-readable error message',
      example: 'Store ID mismatch: cart storeId "8333" does not match product storeId "5246"',
    }),
    statusCode: z.number().int().min(400).max(599).openapi({
      description: 'HTTP status code',
      example: 400,
    }),
  })
  .openapi('ErrorResponse');

export type EnrichCartRequest = z.infer<typeof enrichCartRequestSchema>;
export type EnrichCartResponse = z.infer<typeof enrichCartResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
