import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * URL validation schema that blocks private/local addresses
 */
const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
const PRIVATE_IP_REGEX = /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/;
const METADATA_IP_REGEX = /^169\.254\./;

const publicUrlSchema = z
  .string({ message: 'URL must be a string' })
  .min(1, 'URL cannot be empty')
  .url({ message: 'Invalid URL format' })
  .refine(
    (url) => {
      try {
        const { protocol } = new URL(url);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'Only HTTP(S) protocols are allowed',
    },
  )
  .refine(
    (url) => {
      try {
        const hostname = new URL(url).hostname.toLowerCase();

        if (BLOCKED_HOSTNAMES.has(hostname)) {
          return false;
        }

        if (PRIVATE_IP_REGEX.test(hostname)) {
          return false;
        }

        if (METADATA_IP_REGEX.test(hostname)) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        'URL must point to a public address (localhost and private IP ranges are not allowed)',
    },
  )
  .openapi({
    description: 'Public HTTP(S) URL to extract product IDs from',
    example: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
  });

/**
 * Single URL item in request
 */
const urlItemSchema = z
  .object({
    url: publicUrlSchema,
    storeId: z
      .string()
      .min(1, 'Store ID cannot be empty')
      .max(100, 'Store ID is too long')
      .optional()
      .openapi({
        description:
          'Optional store identifier for specific extraction patterns. If not provided, domain is extracted from URL automatically. Recommended: Pass internal Rakuten store ID (e.g., "9528") for best performance. Also accepts domain format (e.g., "nike.com")',
        example: '9528',
      }),
  })
  .openapi('UrlItem');

/**
 * Request body schema for POST /url-analysis
 */
export const createUrlAnalysisRequestSchema = z
  .object({
    urls: z
      .array(urlItemSchema)
      .min(1, 'At least one URL is required')
      .max(100, 'Maximum 100 URLs per request')
      .openapi({
        description: 'Array of URLs to analyze (1-100 per request)',
        example: [
          {
            url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
            storeId: '9528',
          },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      }),
  })
  .openapi('CreateUrlAnalysisRequest');

/**
 * Successful URL analysis result
 */
const successResultSchema = z
  .object({
    url: z.string().min(1).openapi({
      description: 'The original URL that was analyzed',
      example: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
    }),
    storeId: z.string().min(1).optional().openapi({
      description: 'Store ID determined from URL domain or provided in request. Used for pattern matching.',
      example: '9528',
    }),
    productIds: z
      .array(
        z
          .string()
          .min(1)
          .max(24)
          .regex(/^[\w-]+$/),
      )
      .max(12)
      .readonly()
      .openapi({
        description: 'Array of extracted product IDs (max 12)',
        example: ['cn8490-100', '6n8tkb'],
      }),
    count: z.number().int().min(0).max(12).openapi({
      description: 'Number of product IDs extracted',
      example: 2,
    }),
    success: z.literal(true).openapi({
      description: 'Indicates successful processing',
      example: true,
    }),
  })
  .openapi('SuccessResult');

/**
 * Failed URL analysis result
 */
const failureResultSchema = z
  .object({
    url: z.string().min(1).openapi({
      description: 'The original URL that failed',
      example: 'https://invalid-url',
    }),
    error: z.string().min(1).openapi({
      description: 'Error type/code',
      example: 'ValidationError',
    }),
    message: z.string().min(1).openapi({
      description: 'Human-readable error message',
      example: 'url: Invalid URL format',
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
const resultSchema = z.union([successResultSchema, failureResultSchema]).openapi('AnalysisResult');

/**
 * Success response schema
 */
export const createUrlAnalysisResponseSchema = z
  .object({
    results: z.array(resultSchema).openapi({
      description: 'Array of analysis results, one per input URL',
      example: [
        {
          url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
          storeId: '9528',
          productIds: ['cn8490-100', '6n8tkb'],
          count: 2,
          success: true,
        },
        {
          url: 'https://invalid-url',
          error: 'ValidationError',
          message: 'url: Invalid URL format',
          success: false,
        },
      ],
    }),
    total: z.number().int().min(0).openapi({
      description: 'Total number of URLs processed',
      example: 2,
    }),
    successful: z.number().int().min(0).openapi({
      description: 'Number of successfully processed URLs',
      example: 1,
    }),
    failed: z.number().int().min(0).openapi({
      description: 'Number of failed URLs',
      example: 1,
    }),
  })
  .openapi('CreateUrlAnalysisResponse');

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
      example: 'url: Invalid URL format',
    }),
    statusCode: z.number().int().min(400).max(599).openapi({
      description: 'HTTP status code',
      example: 400,
    }),
  })
  .openapi('ErrorResponse');

export type CreateUrlAnalysisRequest = z.infer<typeof createUrlAnalysisRequestSchema>;
export type CreateUrlAnalysisResponse = z.infer<typeof createUrlAnalysisResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type UrlItem = z.infer<typeof urlItemSchema>;
export type AnalysisResult = z.infer<typeof resultSchema>;
export type SuccessResult = z.infer<typeof successResultSchema>;
export type FailureResult = z.infer<typeof failureResultSchema>;
