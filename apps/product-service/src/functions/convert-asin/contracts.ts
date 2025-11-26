import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * ASIN validation schema
 * ASINs are 10-character alphanumeric identifiers
 */
const asinSchema = z
  .string({ message: 'ASIN must be a string' })
  .length(10, 'ASIN must be exactly 10 characters')
  .regex(/^[A-Z0-9]{10}$/, 'ASIN must contain only uppercase letters and numbers')
  .openapi({
    description: 'Amazon Standard Identification Number (10 alphanumeric characters)',
    example: 'B08N5WRWNW',
  });

/**
 * Request body schema for POST /convert-asin
 */
export const convertAsinRequestSchema = z
  .object({
    asins: z
      .array(asinSchema)
      .min(1, 'At least one ASIN is required')
      .max(10, 'Maximum 10 ASINs allowed per request')
      .openapi({
        description: 'Array of Amazon ASINs to convert to product identifiers (UPC, SKU, MPN)',
        example: ['B08N5WRWNW', 'B07ZPKN6YR'],
      }),
  })
  .openapi('ConvertAsinRequest');

/**
 * Success result for a single ASIN conversion
 */
const successResultSchema = z
  .object({
    asin: z.string().length(10).openapi({
      description: 'The ASIN that was converted',
      example: 'B08N5WRWNW',
    }),
    identifiers: z
      .object({
        upc: z.string().optional().openapi({
          description: 'Universal Product Code',
          example: '012345678905',
        }),
        sku: z.string().optional().openapi({
          description: 'Stock Keeping Unit',
          example: 'SKU-123',
        }),
        mpn: z.string().optional().openapi({
          description: 'Manufacturer Part Number',
          example: 'MPN-456',
        }),
      })
      .openapi({
        description: 'Structured product identifiers (UPC, SKU, MPN)',
        example: {
          upc: '012345678905',
          sku: 'SKU-123',
          mpn: 'MPN-456',
        },
      }),
    success: z.literal(true).openapi({
      description: 'Indicates successful conversion',
      example: true,
    }),
  })
  .openapi('SuccessResult');

/**
 * Failure result for a single ASIN conversion
 */
const failureResultSchema = z
  .object({
    asin: z.string().length(10).openapi({
      description: 'The ASIN that failed conversion',
      example: 'B0EXAMPLE',
    }),
    error: z.string().min(1).openapi({
      description: 'Error type/code',
      example: 'ProductNotFoundError',
    }),
    message: z.string().min(1).openapi({
      description: 'Human-readable error message',
      example: 'Product not found for ASIN: B0EXAMPLE',
    }),
    success: z.literal(false).openapi({
      description: 'Indicates failed conversion',
      example: false,
    }),
  })
  .openapi('FailureResult');

/**
 * Result for a single ASIN conversion (either success or failure)
 */
const conversionResultSchema = z.union([successResultSchema, failureResultSchema]).openapi('ConversionResult');

/**
 * Success response schema with per-item results
 */
export const convertAsinResponseSchema = z
  .object({
    results: z
      .array(conversionResultSchema)
      .openapi({
        description: 'Array of conversion results, one per input ASIN',
        example: [
          {
            asin: 'B08N5WRWNW',
            identifiers: {
              upc: '012345678905',
              sku: 'SKU-123',
              mpn: 'MPN-456',
            },
            success: true,
          },
          {
            asin: 'B0EXAMPLE',
            error: 'ProductNotFoundError',
            message: 'Product not found for ASIN: B0EXAMPLE',
            success: false,
          },
        ],
      }),
    total: z.number().int().min(0).openapi({
      description: 'Total number of ASINs processed',
      example: 2,
    }),
    successful: z.number().int().min(0).openapi({
      description: 'Number of successfully converted ASINs',
      example: 1,
    }),
    failed: z.number().int().min(0).openapi({
      description: 'Number of failed conversions',
      example: 1,
    }),
  })
  .openapi('ConvertAsinResponse');

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
      example: 'asins.0: ASIN must be exactly 10 characters',
    }),
    statusCode: z.number().int().min(400).max(599).openapi({
      description: 'HTTP status code',
      example: 400,
    }),
  })
  .openapi('ErrorResponse');

export type ConvertAsinRequest = z.infer<typeof convertAsinRequestSchema>;
export type ConvertAsinResponse = z.infer<typeof convertAsinResponseSchema>;
export type SuccessResult = z.infer<typeof successResultSchema>;
export type FailureResult = z.infer<typeof failureResultSchema>;
export type ConversionResult = z.infer<typeof conversionResultSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
