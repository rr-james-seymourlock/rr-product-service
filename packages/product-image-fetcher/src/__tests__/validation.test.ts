import { describe, expect, it } from 'vitest';

import {
  extractDomain,
  getExtensionFromContentType,
  isAllowedContentType,
  isBlockedContentType,
  isValidImageUrl,
} from '../validation.js';

describe('validation', () => {
  describe('isAllowedContentType', () => {
    it('should allow image/jpeg', () => {
      expect(isAllowedContentType('image/jpeg')).toBe(true);
    });

    it('should allow image/png', () => {
      expect(isAllowedContentType('image/png')).toBe(true);
    });

    it('should allow image/webp', () => {
      expect(isAllowedContentType('image/webp')).toBe(true);
    });

    it('should handle content-type with charset', () => {
      expect(isAllowedContentType('image/jpeg; charset=utf-8')).toBe(true);
    });

    it('should handle uppercase content-type', () => {
      expect(isAllowedContentType('IMAGE/JPEG')).toBe(true);
    });

    it('should reject image/gif', () => {
      expect(isAllowedContentType('image/gif')).toBe(false);
    });

    it('should reject image/svg+xml', () => {
      expect(isAllowedContentType('image/svg+xml')).toBe(false);
    });

    it('should reject text/html', () => {
      expect(isAllowedContentType('text/html')).toBe(false);
    });
  });

  describe('isBlockedContentType', () => {
    it('should block image/gif', () => {
      expect(isBlockedContentType('image/gif')).toBe(true);
    });

    it('should block image/svg+xml', () => {
      expect(isBlockedContentType('image/svg+xml')).toBe(true);
    });

    it('should block image/bmp', () => {
      expect(isBlockedContentType('image/bmp')).toBe(true);
    });

    it('should not block image/jpeg', () => {
      expect(isBlockedContentType('image/jpeg')).toBe(false);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from full URL', () => {
      expect(extractDomain('https://www.example.com/path/to/image.jpg')).toBe('www.example.com');
    });

    it("should extract domain from Macy's image URL", () => {
      expect(
        extractDomain(
          'https://slimages.macysassets.com/is/image/MCY/products/2/optimized/31898232_fpx.tif',
        ),
      ).toBe('slimages.macysassets.com');
    });

    it('should extract domain from Nike image URL', () => {
      expect(
        extractDomain(
          'https://static.nike.com/a/images/t_default/3b923ea5-1a71-40ea-a56b-2fee14446ac8/AONE.png',
        ),
      ).toBe('static.nike.com');
    });

    it('should return unknown for invalid URL', () => {
      expect(extractDomain('not-a-valid-url')).toBe('unknown');
    });
  });

  describe('getExtensionFromContentType', () => {
    it('should return jpg for image/jpeg', () => {
      expect(getExtensionFromContentType('image/jpeg')).toBe('jpg');
    });

    it('should return png for image/png', () => {
      expect(getExtensionFromContentType('image/png')).toBe('png');
    });

    it('should return webp for image/webp', () => {
      expect(getExtensionFromContentType('image/webp')).toBe('webp');
    });

    it('should handle content-type with charset', () => {
      expect(getExtensionFromContentType('image/jpeg; charset=utf-8')).toBe('jpg');
    });

    it('should extract extension from unknown content types', () => {
      expect(getExtensionFromContentType('image/gif')).toBe('gif');
    });
  });

  describe('isValidImageUrl', () => {
    it('should accept https URLs', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should accept http URLs', () => {
      expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('should reject data URLs', () => {
      expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(false);
    });

    it('should reject file URLs', () => {
      expect(isValidImageUrl('file:///path/to/image.jpg')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidImageUrl('not-a-url')).toBe(false);
    });

    it('should accept complex CDN URLs like Cloudinary', () => {
      expect(
        isValidImageUrl(
          'https://assets.bombas.com/image/fetch/c_crop,h_3040,w_3040/b_rgb:f1f1ee/image.png',
        ),
      ).toBe(true);
    });
  });
});
