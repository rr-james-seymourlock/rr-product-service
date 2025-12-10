import { ALLOWED_CONTENT_TYPES, type AllowedContentType, BLOCKED_CONTENT_TYPES } from './types.js';

/**
 * Check if a content-type is allowed
 * @param contentType - Content-Type header value from response
 * @returns true if the content type is allowed
 */
export function isAllowedContentType(contentType: string): contentType is AllowedContentType {
  // Normalize content type (remove charset, etc.)
  const normalized = contentType.toLowerCase().split(';')[0]?.trim() ?? '';

  return ALLOWED_CONTENT_TYPES.includes(normalized as AllowedContentType);
}

/**
 * Check if a content-type is explicitly blocked
 * @param contentType - Content-Type header value from response
 * @returns true if the content type is blocked
 */
export function isBlockedContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(';')[0]?.trim() ?? '';

  return BLOCKED_CONTENT_TYPES.includes(normalized as (typeof BLOCKED_CONTENT_TYPES)[number]);
}

/**
 * Extract domain from a URL for logging/metrics
 * @param url - Full URL string
 * @returns Domain (hostname) or 'unknown' if parsing fails
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Get file extension from content-type
 * @param contentType - Content-Type header value
 * @returns File extension without dot (e.g., 'jpg', 'png', 'webp')
 */
export function getExtensionFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase().split(';')[0]?.trim() ?? '';

  switch (normalized) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      // Fallback: extract from content type (e.g., image/gif -> gif)
      return normalized.split('/')[1] ?? 'bin';
  }
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns true if URL is valid HTTP(S)
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
