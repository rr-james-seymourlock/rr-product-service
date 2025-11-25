import { productIdsSchema } from '@rr/product-id-extractor';
import { z } from 'zod';

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

        // Check blocked hostnames
        if (BLOCKED_HOSTNAMES.has(hostname)) {
          return false;
        }

        // Check private IP ranges
        if (PRIVATE_IP_REGEX.test(hostname)) {
          return false;
        }

        // Check AWS metadata IP
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
  );

/**
 * Request schema for extract product IDs endpoint
 *
 * Validates query parameters:
 * - url: Required, must be a valid public HTTP(S) URL
 * - storeId: Optional, must be a non-empty string if provided
 */
export const extractProductIdsRequestSchema = z.object({
  url: publicUrlSchema,
  storeId: z
    .string()
    .min(1, 'Store ID cannot be empty')
    .max(100, 'Store ID is too long')
    .optional(),
});

/**
 * Response schema for extract product IDs endpoint
 *
 * Validates the response structure:
 * - url: The original URL that was processed
 * - productIds: Array of extracted product IDs (validated by productIdsSchema)
 * - count: Number of product IDs extracted
 */
export const extractProductIdsResponseSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  productIds: productIdsSchema,
  count: z.number().int().min(0).max(12),
});

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  error: z.string().min(1),
  message: z.string().min(1),
  statusCode: z.number().int().min(400).max(599),
});
