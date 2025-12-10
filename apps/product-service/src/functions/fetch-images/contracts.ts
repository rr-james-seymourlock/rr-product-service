import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Note: We define our own OpenAPI-extended schemas below rather than using
// the package schemas directly, to add OpenAPI metadata for documentation

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * Single image fetch request item
 * Re-wrap the imported schema with OpenAPI metadata
 */
const imageFetchRequestItemSchema = z
  .object({
    storeId: z.string().min(1).openapi({
      description: 'Rakuten store ID for organization and metrics',
      example: '8333',
    }),
    productUrl: z.string().url().openapi({
      description: 'Product page URL - used as Referer header to reduce bot detection',
      example: 'https://www.macys.com/shop/product/12345',
    }),
    imageUrl: z.string().url().openapi({
      description: 'Image URL to fetch',
      example:
        'https://slimages.macysassets.com/is/image/MCY/products/2/optimized/31898232_fpx.tif',
    }),
  })
  .openapi('ImageFetchRequestItem');

/**
 * Request body schema for POST /images/fetch
 */
export const fetchImagesRequestSchema = z
  .object({
    requests: z
      .array(imageFetchRequestItemSchema)
      .min(1, 'At least one request is required')
      .max(100, 'Maximum 100 requests per batch')
      .openapi({
        description: 'Array of image fetch requests (1-100 per batch)',
        example: [
          {
            storeId: '8333',
            productUrl: 'https://www.macys.com/shop/product/12345',
            imageUrl:
              'https://slimages.macysassets.com/is/image/MCY/products/2/optimized/31898232_fpx.tif',
          },
        ],
      }),
  })
  .openapi('FetchImagesRequest');

/**
 * Successful image fetch result
 */
const successResultSchema = z
  .object({
    success: z.literal(true).openapi({
      description: 'Indicates successful fetch',
      example: true,
    }),
    storagePath: z.string().openapi({
      description: 'Path where the image was stored',
      example: '8333/a1b2c3d4e5f6g7h8.jpg',
    }),
    contentType: z.string().openapi({
      description: 'Actual content type from the response',
      example: 'image/jpeg',
    }),
    sizeBytes: z.number().openapi({
      description: 'Image size in bytes',
      example: 8060,
    }),
    domain: z.string().openapi({
      description: 'Domain of the image URL',
      example: 'slimages.macysassets.com',
    }),
  })
  .openapi('ImageFetchSuccessResult');

/**
 * Failed image fetch result
 */
const failureResultSchema = z
  .object({
    success: z.literal(false).openapi({
      description: 'Indicates failed fetch',
      example: false,
    }),
    error: z
      .object({
        code: z.string().openapi({
          description: 'Error code for programmatic handling',
          example: 'FORBIDDEN',
        }),
        message: z.string().openapi({
          description: 'Human-readable error message',
          example: 'HTTP 403 error fetching image',
        }),
        isPermanent: z.boolean().openapi({
          description: 'Whether this is a permanent failure (should not retry)',
          example: true,
        }),
        statusCode: z.number().optional().openapi({
          description: 'HTTP status code if available',
          example: 403,
        }),
        retryAfter: z.number().optional().openapi({
          description: 'Retry-After value in seconds (for 429 responses)',
          example: 60,
        }),
        domain: z.string().openapi({
          description: 'Domain of the image URL',
          example: 'example.com',
        }),
      })
      .openapi('ImageFetchError'),
  })
  .openapi('ImageFetchFailureResult');

/**
 * Union of success and failure results
 */
const resultSchema = z
  .union([successResultSchema, failureResultSchema])
  .openapi('ImageFetchResult');

/**
 * Response schema for POST /images/fetch
 */
export const fetchImagesResponseSchema = z
  .object({
    results: z.array(resultSchema).openapi({
      description: 'Array of fetch results, one per input request (order matches input)',
      example: [
        {
          success: true,
          storagePath: '8333/a1b2c3d4e5f6g7h8.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 8060,
          domain: 'slimages.macysassets.com',
        },
      ],
    }),
    total: z.number().int().min(0).openapi({
      description: 'Total number of requests processed',
      example: 1,
    }),
    successful: z.number().int().min(0).openapi({
      description: 'Number of successful fetches',
      example: 1,
    }),
    failed: z.number().int().min(0).openapi({
      description: 'Number of failed fetches',
      example: 0,
    }),
  })
  .openapi('FetchImagesResponse');

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
      example: 'requests: At least one request is required',
    }),
    statusCode: z.number().int().min(400).max(599).openapi({
      description: 'HTTP status code',
      example: 400,
    }),
  })
  .openapi('ErrorResponse');

export type FetchImagesRequest = z.infer<typeof fetchImagesRequestSchema>;
export type FetchImagesResponse = z.infer<typeof fetchImagesResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ImageFetchResult = z.infer<typeof resultSchema>;
