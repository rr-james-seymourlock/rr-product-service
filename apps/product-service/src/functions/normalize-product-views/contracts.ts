import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { NormalizedProductSchema, RawProductViewEventSchema } from '@rr/product-event-normalizer';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * Single product view item in request
 * Re-wrap the imported schema with OpenAPI metadata since
 * the original was created before extendZodWithOpenApi was called
 */
const productViewItemSchema = z.object(RawProductViewEventSchema.shape).openapi('ProductViewItem');

/**
 * Request body schema for POST /product-views/normalize
 */
export const normalizeProductViewsRequestSchema = z
  .object({
    events: z
      .array(productViewItemSchema)
      .min(1, 'At least one product view is required')
      .max(100, 'Maximum 100 product views per request')
      .openapi({
        description: 'Array of raw product view events to normalize (1-100 per request)',
        example: [
          {
            store_id: 5246,
            store_name: 'target.com',
            name: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
            url: 'https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt/-/A-88056717',
            image_url: 'https://target.scene7.com/is/image/Target/GUEST_88056717',
            sku: ['88056717'],
            offers: [{ price: 800, sku: '88056717' }],
            brand: 'A New Day',
          },
        ],
      }),
  })
  .openapi('NormalizeProductViewsRequest');

/**
 * Normalized product in response
 * Re-wrap the imported schema with OpenAPI metadata
 */
const normalizedProductSchema = z
  .object(NormalizedProductSchema.shape)
  .openapi('NormalizedProduct');

/**
 * Successful product view normalization result
 */
const successResultSchema = z
  .object({
    storeId: z.string().optional().openapi({
      description: 'Store ID from the product view event (coerced to string)',
      example: '5246',
    }),
    storeName: z.string().optional().openapi({
      description: 'Store name from the product view event',
      example: 'target.com',
    }),
    products: z.array(normalizedProductSchema).openapi({
      description: 'Array of normalized products with extracted IDs',
      example: [
        {
          title: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
          url: 'https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt/-/A-88056717',
          imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_88056717',
          storeId: '5246',
          price: 800,
          productIds: ['88056717'],
          brand: 'A New Day',
        },
      ],
    }),
    productCount: z.number().int().min(0).openapi({
      description: 'Number of normalized products',
      example: 1,
    }),
    success: z.literal(true).openapi({
      description: 'Indicates successful processing',
      example: true,
    }),
  })
  .openapi('SuccessResult');

/**
 * Failed product view normalization result
 */
const failureResultSchema = z
  .object({
    error: z.string().min(1).openapi({
      description: 'Error type/code',
      example: 'ValidationError',
    }),
    message: z.string().min(1).openapi({
      description: 'Human-readable error message',
      example: 'Invalid product view event structure',
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
export const normalizeProductViewsResponseSchema = z
  .object({
    results: z.array(resultSchema).openapi({
      description:
        'Array of normalization results, one per input product view (order matches input)',
      example: [
        {
          storeId: '5246',
          storeName: 'target.com',
          products: [
            {
              title: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
              url: 'https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt/-/A-88056717',
              imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_88056717',
              storeId: '5246',
              price: 800,
              productIds: ['88056717'],
              brand: 'A New Day',
            },
          ],
          productCount: 1,
          success: true,
        },
      ],
    }),
    total: z.number().int().min(0).openapi({
      description: 'Total number of product views processed',
      example: 1,
    }),
    successful: z.number().int().min(0).openapi({
      description: 'Number of successfully processed product views',
      example: 1,
    }),
    failed: z.number().int().min(0).openapi({
      description: 'Number of failed product views',
      example: 0,
    }),
    totalProducts: z.number().int().min(0).openapi({
      description: 'Total number of normalized products across all views',
      example: 1,
    }),
  })
  .openapi('NormalizeProductViewsResponse');

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
      example: 'events: At least one product view event is required',
    }),
    statusCode: z.number().int().min(400).max(599).openapi({
      description: 'HTTP status code',
      example: 400,
    }),
  })
  .openapi('ErrorResponse');

export type NormalizeProductViewsRequest = z.infer<typeof normalizeProductViewsRequestSchema>;
export type NormalizeProductViewsResponse = z.infer<typeof normalizeProductViewsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type NormalizationResult = z.infer<typeof resultSchema>;
export type SuccessResult = z.infer<typeof successResultSchema>;
export type FailureResult = z.infer<typeof failureResultSchema>;
