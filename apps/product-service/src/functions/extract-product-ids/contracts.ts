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
      message: 'URL must point to a public address (localhost and private IP ranges are not allowed)',
    },
  )
  .openapi({
    description: 'Public HTTP(S) URL to extract product IDs from',
    example: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
  });

/**
 * Request query parameters schema
 */
export const extractProductIdsRequestSchema = z
  .object({
    url: publicUrlSchema,
    storeId: z
      .string()
      .min(1, 'Store ID cannot be empty')
      .max(100, 'Store ID is too long')
      .optional()
      .openapi({
        description: 'Optional store ID to use specific extraction patterns',
        example: '12345',
      }),
  })
  .openapi('ExtractProductIdsRequest');

/**
 * Success response schema
 */
export const extractProductIdsResponseSchema = z
  .object({
    url: z.string().min(1, 'URL is required').openapi({
      description: 'The original URL that was processed',
      example: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
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
  })
  .openapi('ExtractProductIdsResponse');

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

export type ExtractProductIdsRequest = z.infer<typeof extractProductIdsRequestSchema>;
export type ExtractProductIdsResponse = z.infer<typeof extractProductIdsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
