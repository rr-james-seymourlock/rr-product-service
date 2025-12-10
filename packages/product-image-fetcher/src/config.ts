import { ALLOWED_CONTENT_TYPES, type ImageFetcherOptions } from './types.js';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  /**
   * Request timeout in milliseconds
   */
  TIMEOUT_MS: 10_000,

  /**
   * Minimum image size in bytes (1KB - reject placeholder pixels)
   */
  MIN_SIZE_BYTES: 1024,

  /**
   * Maximum image size in bytes (10MB)
   */
  MAX_SIZE_BYTES: 10 * 1024 * 1024,

  /**
   * Realistic Chrome User-Agent to reduce bot detection
   */
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  /**
   * Accept header for image requests
   */
  ACCEPT_HEADER: 'image/webp,image/png,image/jpeg,image/*;q=0.8',

  /**
   * Default storage path for local development
   */
  STORAGE_PATH: './fetched-images',

  /**
   * Lambda /tmp storage path
   */
  LAMBDA_STORAGE_PATH: '/tmp/fetched-images',

  /**
   * Batch processing concurrency limit
   */
  BATCH_CONCURRENCY: 10,
} as const;

/**
 * Check if running in AWS Lambda environment
 */
export function isLambdaEnvironment(): boolean {
  return !!process.env['AWS_LAMBDA_FUNCTION_NAME'];
}

/**
 * Get the storage base path based on environment
 */
export function getStoragePath(options?: ImageFetcherOptions): string {
  if (options?.storagePath) {
    return options.storagePath;
  }

  const envPath = process.env['IMAGE_STORAGE_PATH'];
  if (envPath) {
    return envPath;
  }

  return isLambdaEnvironment() ? DEFAULT_CONFIG.LAMBDA_STORAGE_PATH : DEFAULT_CONFIG.STORAGE_PATH;
}

/**
 * Get resolved configuration with defaults and env overrides
 */
export function getConfig(options?: ImageFetcherOptions) {
  return {
    timeoutMs:
      options?.timeoutMs ??
      (process.env['IMAGE_FETCH_TIMEOUT_MS']
        ? parseInt(process.env['IMAGE_FETCH_TIMEOUT_MS'], 10)
        : DEFAULT_CONFIG.TIMEOUT_MS),

    minSizeBytes:
      options?.minSizeBytes ??
      (process.env['IMAGE_MIN_SIZE_BYTES']
        ? parseInt(process.env['IMAGE_MIN_SIZE_BYTES'], 10)
        : DEFAULT_CONFIG.MIN_SIZE_BYTES),

    maxSizeBytes:
      options?.maxSizeBytes ??
      (process.env['IMAGE_MAX_SIZE_BYTES']
        ? parseInt(process.env['IMAGE_MAX_SIZE_BYTES'], 10)
        : DEFAULT_CONFIG.MAX_SIZE_BYTES),

    userAgent: options?.userAgent ?? process.env['IMAGE_USER_AGENT'] ?? DEFAULT_CONFIG.USER_AGENT,

    storagePath: getStoragePath(options),

    batchConcurrency: process.env['IMAGE_BATCH_CONCURRENCY']
      ? parseInt(process.env['IMAGE_BATCH_CONCURRENCY'], 10)
      : DEFAULT_CONFIG.BATCH_CONCURRENCY,

    acceptHeader: DEFAULT_CONFIG.ACCEPT_HEADER,

    allowedContentTypes: ALLOWED_CONTENT_TYPES,
  };
}

export type ResolvedConfig = ReturnType<typeof getConfig>;
