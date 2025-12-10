// Main exports
export { fetchAndStoreImage, fetchAndStoreImages } from './fetcher.js';

// Types
export {
  ALLOWED_CONTENT_TYPES,
  BLOCKED_CONTENT_TYPES,
  BatchImageFetchRequestSchema,
  BatchImageFetchResponseSchema,
  ImageFetchErrorCode,
  ImageFetchErrorSchema,
  ImageFetchFailureSchema,
  ImageFetchRequestSchema,
  ImageFetchResultSchema,
  ImageFetchSuccessSchema,
  type AllowedContentType,
  type BatchImageFetchRequest,
  type BatchImageFetchResponse,
  type ImageFetchError,
  type ImageFetcherOptions,
  type ImageFetchFailure,
  type ImageFetchRequest,
  type ImageFetchResult,
  type ImageFetchSuccess,
} from './types.js';

// Config
export { DEFAULT_CONFIG, getConfig, getStoragePath, isLambdaEnvironment } from './config.js';

// Validation utilities
export {
  extractDomain,
  getExtensionFromContentType,
  isAllowedContentType,
  isBlockedContentType,
  isValidImageUrl,
} from './validation.js';

// Error utilities
export {
  createContentTypeError,
  createHttpError,
  createInvalidUrlError,
  createNetworkError,
  createSizeError,
  isPermanentStatusCode,
  isRetriableStatusCode,
  parseRetryAfter,
} from './errors.js';

// Storage utilities
export {
  generateStoragePath,
  getStoredImageSize,
  imageExists,
  storeImage,
  type StorageResult,
} from './storage.js';
