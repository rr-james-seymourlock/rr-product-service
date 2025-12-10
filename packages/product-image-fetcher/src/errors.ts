import { type ImageFetchError, ImageFetchErrorCode } from './types.js';
import { extractDomain } from './validation.js';

/**
 * HTTP status codes that indicate permanent failures (should not retry)
 */
const PERMANENT_STATUS_CODES = new Set([400, 401, 403, 404, 405, 410, 414, 415, 451]);

/**
 * HTTP status codes that indicate retriable failures
 */
const RETRIABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Categorize an HTTP status code as permanent or retriable failure
 */
export function isPermanentStatusCode(statusCode: number): boolean {
  return PERMANENT_STATUS_CODES.has(statusCode);
}

/**
 * Categorize an HTTP status code as retriable
 */
export function isRetriableStatusCode(statusCode: number): boolean {
  return RETRIABLE_STATUS_CODES.has(statusCode);
}

/**
 * Get error code from HTTP status code
 */
export function getErrorCodeFromStatus(statusCode: number): ImageFetchErrorCode {
  switch (statusCode) {
    case 401:
      return ImageFetchErrorCode.UNAUTHORIZED;
    case 403:
      return ImageFetchErrorCode.FORBIDDEN;
    case 404:
      return ImageFetchErrorCode.NOT_FOUND;
    case 410:
      return ImageFetchErrorCode.GONE;
    case 429:
      return ImageFetchErrorCode.RATE_LIMITED;
    default:
      if (statusCode >= 500) {
        return ImageFetchErrorCode.SERVER_ERROR;
      }
      return ImageFetchErrorCode.SERVER_ERROR;
  }
}

/**
 * Parse Retry-After header value
 * @param retryAfter - Retry-After header value (seconds or HTTP date)
 * @returns Number of seconds to wait, or undefined if invalid
 */
export function parseRetryAfter(retryAfter: string | null): number | undefined {
  if (!retryAfter) {
    return undefined;
  }

  // Try parsing as integer (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds;
  }

  // Try parsing as HTTP date
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) {
    const delayMs = date - Date.now();
    if (delayMs > 0) {
      return Math.ceil(delayMs / 1000);
    }
  }

  return undefined;
}

/**
 * Create an ImageFetchError from an HTTP response
 */
export function createHttpError(
  statusCode: number,
  imageUrl: string,
  retryAfterHeader?: string | null,
): ImageFetchError {
  const domain = extractDomain(imageUrl);
  const isPermanent = isPermanentStatusCode(statusCode);
  const code = getErrorCodeFromStatus(statusCode);

  return {
    code,
    message: `HTTP ${statusCode} error fetching image`,
    isPermanent,
    statusCode,
    retryAfter: parseRetryAfter(retryAfterHeader ?? null),
    domain,
  };
}

/**
 * Create an ImageFetchError for invalid content type
 */
export function createContentTypeError(contentType: string, imageUrl: string): ImageFetchError {
  return {
    code: ImageFetchErrorCode.INVALID_CONTENT_TYPE,
    message: `Invalid content type: ${contentType}. Allowed types: image/jpeg, image/png, image/webp`,
    isPermanent: true,
    domain: extractDomain(imageUrl),
  };
}

/**
 * Create an ImageFetchError for image size violations
 */
export function createSizeError(
  sizeBytes: number,
  minBytes: number,
  maxBytes: number,
  imageUrl: string,
): ImageFetchError {
  const isTooSmall = sizeBytes < minBytes;

  return {
    code: isTooSmall ? ImageFetchErrorCode.IMAGE_TOO_SMALL : ImageFetchErrorCode.IMAGE_TOO_LARGE,
    message: isTooSmall
      ? `Image too small: ${sizeBytes} bytes (minimum: ${minBytes} bytes)`
      : `Image too large: ${sizeBytes} bytes (maximum: ${maxBytes} bytes)`,
    isPermanent: true,
    domain: extractDomain(imageUrl),
  };
}

/**
 * Create an ImageFetchError for network/timeout errors
 */
export function createNetworkError(error: Error, imageUrl: string): ImageFetchError {
  const isTimeout = error.name === 'TimeoutError' || error.message.includes('timeout');

  return {
    code: isTimeout ? ImageFetchErrorCode.TIMEOUT : ImageFetchErrorCode.NETWORK_ERROR,
    message: isTimeout ? `Request timed out: ${error.message}` : `Network error: ${error.message}`,
    isPermanent: false,
    domain: extractDomain(imageUrl),
  };
}

/**
 * Create an ImageFetchError for invalid URL
 */
export function createInvalidUrlError(imageUrl: string): ImageFetchError {
  return {
    code: ImageFetchErrorCode.INVALID_URL,
    message: `Invalid image URL: ${imageUrl}`,
    isPermanent: true,
    domain: extractDomain(imageUrl),
  };
}
