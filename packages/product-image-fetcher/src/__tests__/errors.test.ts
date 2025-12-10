import { describe, expect, it } from 'vitest';

import {
  createContentTypeError,
  createHttpError,
  createInvalidUrlError,
  createNetworkError,
  createSizeError,
  isPermanentStatusCode,
  isRetriableStatusCode,
  parseRetryAfter,
} from '../errors.js';
import { ImageFetchErrorCode } from '../types.js';

describe('errors', () => {
  describe('isPermanentStatusCode', () => {
    it('should return true for 400', () => {
      expect(isPermanentStatusCode(400)).toBe(true);
    });

    it('should return true for 401', () => {
      expect(isPermanentStatusCode(401)).toBe(true);
    });

    it('should return true for 403', () => {
      expect(isPermanentStatusCode(403)).toBe(true);
    });

    it('should return true for 404', () => {
      expect(isPermanentStatusCode(404)).toBe(true);
    });

    it('should return true for 410', () => {
      expect(isPermanentStatusCode(410)).toBe(true);
    });

    it('should return false for 429', () => {
      expect(isPermanentStatusCode(429)).toBe(false);
    });

    it('should return false for 500', () => {
      expect(isPermanentStatusCode(500)).toBe(false);
    });
  });

  describe('isRetriableStatusCode', () => {
    it('should return true for 429', () => {
      expect(isRetriableStatusCode(429)).toBe(true);
    });

    it('should return true for 500', () => {
      expect(isRetriableStatusCode(500)).toBe(true);
    });

    it('should return true for 503', () => {
      expect(isRetriableStatusCode(503)).toBe(true);
    });

    it('should return false for 404', () => {
      expect(isRetriableStatusCode(404)).toBe(false);
    });
  });

  describe('parseRetryAfter', () => {
    it('should parse integer seconds', () => {
      expect(parseRetryAfter('60')).toBe(60);
    });

    it('should return undefined for null', () => {
      expect(parseRetryAfter(null)).toBeUndefined();
    });

    it('should return undefined for invalid value', () => {
      expect(parseRetryAfter('invalid')).toBeUndefined();
    });

    it('should return undefined for negative values', () => {
      expect(parseRetryAfter('-10')).toBeUndefined();
    });

    it('should parse HTTP date in the future', () => {
      const futureDate = new Date(Date.now() + 120_000).toUTCString();
      const result = parseRetryAfter(futureDate);
      expect(result).toBeGreaterThan(100);
      expect(result).toBeLessThan(130);
    });
  });

  describe('createHttpError', () => {
    it('should create permanent error for 403', () => {
      const error = createHttpError(403, 'https://example.com/image.jpg');
      expect(error.code).toBe(ImageFetchErrorCode.FORBIDDEN);
      expect(error.isPermanent).toBe(true);
      expect(error.statusCode).toBe(403);
      expect(error.domain).toBe('example.com');
    });

    it('should create retriable error for 429', () => {
      const error = createHttpError(429, 'https://example.com/image.jpg', '60');
      expect(error.code).toBe(ImageFetchErrorCode.RATE_LIMITED);
      expect(error.isPermanent).toBe(false);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it('should create retriable error for 500', () => {
      const error = createHttpError(500, 'https://example.com/image.jpg');
      expect(error.code).toBe(ImageFetchErrorCode.SERVER_ERROR);
      expect(error.isPermanent).toBe(false);
    });
  });

  describe('createContentTypeError', () => {
    it('should create permanent error with content type info', () => {
      const error = createContentTypeError('image/gif', 'https://example.com/image.gif');
      expect(error.code).toBe(ImageFetchErrorCode.INVALID_CONTENT_TYPE);
      expect(error.isPermanent).toBe(true);
      expect(error.message).toContain('image/gif');
      expect(error.domain).toBe('example.com');
    });
  });

  describe('createSizeError', () => {
    it('should create error for too small image', () => {
      const error = createSizeError(500, 1024, 10_000_000, 'https://example.com/image.jpg');
      expect(error.code).toBe(ImageFetchErrorCode.IMAGE_TOO_SMALL);
      expect(error.isPermanent).toBe(true);
      expect(error.message).toContain('500 bytes');
    });

    it('should create error for too large image', () => {
      const error = createSizeError(20_000_000, 1024, 10_000_000, 'https://example.com/image.jpg');
      expect(error.code).toBe(ImageFetchErrorCode.IMAGE_TOO_LARGE);
      expect(error.isPermanent).toBe(true);
      expect(error.message).toContain('20000000 bytes');
    });
  });

  describe('createNetworkError', () => {
    it('should create timeout error for timeout message', () => {
      const error = createNetworkError(
        new Error('Request timeout'),
        'https://example.com/image.jpg',
      );
      expect(error.code).toBe(ImageFetchErrorCode.TIMEOUT);
      expect(error.isPermanent).toBe(false);
    });

    it('should create timeout error for TimeoutError name', () => {
      const timeoutError = new Error('aborted');
      timeoutError.name = 'TimeoutError';
      const error = createNetworkError(timeoutError, 'https://example.com/image.jpg');
      expect(error.code).toBe(ImageFetchErrorCode.TIMEOUT);
      expect(error.isPermanent).toBe(false);
    });

    it('should create network error for other errors', () => {
      const error = createNetworkError(new Error('ECONNRESET'), 'https://example.com/image.jpg');
      expect(error.code).toBe(ImageFetchErrorCode.NETWORK_ERROR);
      expect(error.isPermanent).toBe(false);
    });
  });

  describe('createInvalidUrlError', () => {
    it('should create permanent error for invalid URL', () => {
      const error = createInvalidUrlError('not-a-url');
      expect(error.code).toBe(ImageFetchErrorCode.INVALID_URL);
      expect(error.isPermanent).toBe(true);
    });
  });
});
