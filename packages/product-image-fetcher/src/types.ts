import { z } from 'zod';

/**
 * Allowed image content types
 * Note: We validate response content-type, NOT URL extension
 * CDNs often serve different formats than the URL suggests (e.g., .tif -> image/jpeg)
 */
export const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

/**
 * Blocked content types (explicitly rejected)
 */
export const BLOCKED_CONTENT_TYPES = [
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/x-icon',
  'image/tiff',
] as const;

/**
 * Request to fetch and store a product image
 */
export const ImageFetchRequestSchema = z.object({
  /**
   * Rakuten store ID for organization and metrics
   */
  storeId: z.string().min(1),

  /**
   * Product page URL - used as Referer header to reduce bot detection
   */
  productUrl: z.string().url(),

  /**
   * Image URL to fetch
   */
  imageUrl: z.string().url(),
});

export type ImageFetchRequest = z.infer<typeof ImageFetchRequestSchema>;

/**
 * Error codes for image fetch failures
 */
export const ImageFetchErrorCode = {
  // Permanent failures (do not retry)
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  GONE: 'GONE',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  IMAGE_TOO_SMALL: 'IMAGE_TOO_SMALL',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  INVALID_URL: 'INVALID_URL',

  // Retriable failures
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ImageFetchErrorCode = (typeof ImageFetchErrorCode)[keyof typeof ImageFetchErrorCode];

/**
 * Error details for failed image fetch
 */
export const ImageFetchErrorSchema = z.object({
  /**
   * Error code for programmatic handling
   */
  code: z.string(),

  /**
   * Human-readable error message
   */
  message: z.string(),

  /**
   * Whether this is a permanent failure (should not retry)
   */
  isPermanent: z.boolean(),

  /**
   * HTTP status code if available
   */
  statusCode: z.number().optional(),

  /**
   * Retry-After value in seconds if available (for 429 responses)
   */
  retryAfter: z.number().optional(),

  /**
   * Domain of the image URL for per-merchant analytics
   */
  domain: z.string(),
});

export type ImageFetchError = z.infer<typeof ImageFetchErrorSchema>;

/**
 * Successful image fetch result
 */
export const ImageFetchSuccessSchema = z.object({
  success: z.literal(true),

  /**
   * Path where the image was stored
   */
  storagePath: z.string(),

  /**
   * Actual content type from the response
   */
  contentType: z.string(),

  /**
   * Image size in bytes
   */
  sizeBytes: z.number(),

  /**
   * Domain of the image URL
   */
  domain: z.string(),
});

export type ImageFetchSuccess = z.infer<typeof ImageFetchSuccessSchema>;

/**
 * Failed image fetch result
 */
export const ImageFetchFailureSchema = z.object({
  success: z.literal(false),

  /**
   * Error details
   */
  error: ImageFetchErrorSchema,
});

export type ImageFetchFailure = z.infer<typeof ImageFetchFailureSchema>;

/**
 * Image fetch result (success or failure)
 */
export const ImageFetchResultSchema = z.discriminatedUnion('success', [
  ImageFetchSuccessSchema,
  ImageFetchFailureSchema,
]);

export type ImageFetchResult = z.infer<typeof ImageFetchResultSchema>;

/**
 * Options for the image fetcher
 */
export interface ImageFetcherOptions {
  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeoutMs?: number;

  /**
   * Minimum image size in bytes (reject placeholder pixels)
   * @default 1024 (1KB)
   */
  minSizeBytes?: number;

  /**
   * Maximum image size in bytes
   * @default 10485760 (10MB)
   */
  maxSizeBytes?: number;

  /**
   * User-Agent header to use
   * @default Chrome 120+ User-Agent
   */
  userAgent?: string;

  /**
   * Base path for local storage
   * @default './fetched-images' or '/tmp' in Lambda
   */
  storagePath?: string;
}

/**
 * Batch request for fetching multiple images
 */
export const BatchImageFetchRequestSchema = z.object({
  /**
   * Array of image fetch requests (max 100)
   */
  requests: z
    .array(ImageFetchRequestSchema)
    .min(1, 'At least one request is required')
    .max(100, 'Maximum 100 requests per batch'),
});

export type BatchImageFetchRequest = z.infer<typeof BatchImageFetchRequestSchema>;

/**
 * Batch response for multiple image fetches
 */
export const BatchImageFetchResponseSchema = z.object({
  /**
   * Results in same order as requests
   */
  results: z.array(ImageFetchResultSchema),

  /**
   * Total number of requests processed
   */
  total: z.number(),

  /**
   * Number of successful fetches
   */
  successful: z.number(),

  /**
   * Number of failed fetches
   */
  failed: z.number(),
});

export type BatchImageFetchResponse = z.infer<typeof BatchImageFetchResponseSchema>;
