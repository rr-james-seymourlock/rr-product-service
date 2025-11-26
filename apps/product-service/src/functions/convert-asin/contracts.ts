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
        description: 'Array of Amazon ASINs to convert to GTINs (UPC, SKU, MPN)',
        example: ['B08N5WRWNW', 'B07ZPKN6YR'],
      }),
  })
  .openapi('ConvertAsinRequest');

/**
 * Success response schema
 */
export const convertAsinResponseSchema = z
  .object({
    asins: z
      .array(z.string().length(10))
      .readonly()
      .openapi({
        description: 'Original ASINs that were requested',
        example: ['B08N5WRWNW'],
      }),
    gtins: z
      .array(z.string().min(1).max(50))
      .readonly()
      .openapi({
        description: 'Array of converted product identifiers (UPC, SKU, MPN)',
        example: ['012345678905', 'SKU-123', 'MPN-456'],
      }),
    count: z.number().int().min(0).openapi({
      description: 'Number of GTINs/product IDs returned',
      example: 3,
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
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
