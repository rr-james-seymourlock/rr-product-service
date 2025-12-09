import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { CartProductSchema, RawCartEventSchema } from '@rr/cart-normalizer';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * Single cart view item in request
 * Re-wrap the imported schema with OpenAPI metadata since
 * the original was created before extendZodWithOpenApi was called
 */
const cartViewItemSchema = z.object(RawCartEventSchema.shape).openapi('CartViewItem');

/**
 * Request body schema for POST /cart-views/normalize
 */
export const normalizeCartViewsRequestSchema = z
  .object({
    events: z
      .array(cartViewItemSchema)
      .min(1, 'At least one cart view is required')
      .max(100, 'Maximum 100 cart views per request')
      .openapi({
        description: 'Array of raw cart view events to normalize (1-100 per request)',
        example: [
          {
            store_id: 8333,
            store_name: "Macy's",
            product_list: [
              {
                name: "Women's Cotton Sweater",
                url: 'https://macys.com/shop/product?ID=12345',
                item_price: 4900,
                quantity: 1,
              },
            ],
          },
        ],
      }),
  })
  .openapi('NormalizeCartViewsRequest');

/**
 * Normalized product in response
 * Re-wrap the imported schema with OpenAPI metadata
 */
const normalizedProductSchema = z.object(CartProductSchema.shape).openapi('NormalizedProduct');

/**
 * Successful cart event normalization result
 */
const successResultSchema = z
  .object({
    storeId: z.string().optional().openapi({
      description: 'Store ID from the cart event (coerced to string)',
      example: '8333',
    }),
    storeName: z.string().optional().openapi({
      description: 'Store name from the cart event',
      example: "Macy's",
    }),
    products: z.array(normalizedProductSchema).openapi({
      description: 'Array of normalized products with extracted IDs',
      example: [
        {
          title: "Women's Cotton Sweater",
          url: 'https://macys.com/shop/product?ID=12345',
          storeId: '8333',
          price: 4900,
          quantity: 1,
          productIds: ['12345'],
        },
      ],
    }),
    productCount: z.number().int().min(0).openapi({
      description: 'Number of valid products after normalization',
      example: 1,
    }),
    success: z.literal(true).openapi({
      description: 'Indicates successful processing',
      example: true,
    }),
  })
  .openapi('SuccessResult');

/**
 * Failed cart event normalization result
 */
const failureResultSchema = z
  .object({
    error: z.string().min(1).openapi({
      description: 'Error type/code',
      example: 'ValidationError',
    }),
    message: z.string().min(1).openapi({
      description: 'Human-readable error message',
      example: 'Invalid cart event structure',
    }),
    success: z.literal(false).openapi({
      description: 'Indicates failed processing',
      example: false,
    }),
  })
  .openapi('FailureResult');

/**
 * Union of success and failure results
 */
const resultSchema = z
  .union([successResultSchema, failureResultSchema])
  .openapi('NormalizationResult');

/**
 * Success response schema
 */
export const normalizeCartViewsResponseSchema = z
  .object({
    results: z.array(resultSchema).openapi({
      description: 'Array of normalization results, one per input cart view (order matches input)',
      example: [
        {
          storeId: '8333',
          storeName: "Macy's",
          products: [
            {
              title: "Women's Cotton Sweater",
              url: 'https://macys.com/shop/product?ID=12345',
              storeId: '8333',
              price: 4900,
              quantity: 1,
              productIds: ['12345'],
            },
          ],
          productCount: 1,
          success: true,
        },
      ],
    }),
    total: z.number().int().min(0).openapi({
      description: 'Total number of cart views processed',
      example: 1,
    }),
    successful: z.number().int().min(0).openapi({
      description: 'Number of successfully processed cart views',
      example: 1,
    }),
    failed: z.number().int().min(0).openapi({
      description: 'Number of failed cart views',
      example: 0,
    }),
    totalProducts: z.number().int().min(0).openapi({
      description: 'Total number of normalized products across all views',
      example: 1,
    }),
  })
  .openapi('NormalizeCartViewsResponse');

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
      example: 'events: At least one cart event is required',
    }),
    statusCode: z.number().int().min(400).max(599).openapi({
      description: 'HTTP status code',
      example: 400,
    }),
  })
  .openapi('ErrorResponse');

export type NormalizeCartViewsRequest = z.infer<typeof normalizeCartViewsRequestSchema>;
export type NormalizeCartViewsResponse = z.infer<typeof normalizeCartViewsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type NormalizationResult = z.infer<typeof resultSchema>;
export type SuccessResult = z.infer<typeof successResultSchema>;
export type FailureResult = z.infer<typeof failureResultSchema>;
