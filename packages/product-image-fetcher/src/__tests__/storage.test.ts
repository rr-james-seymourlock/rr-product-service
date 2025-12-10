import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generateStoragePath, getStoredImageSize, imageExists, storeImage } from '../storage.js';

describe('storage', () => {
  const testDir = join(tmpdir(), 'product-image-fetcher-test');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generateStoragePath', () => {
    it('should generate deterministic path from URL', () => {
      const path1 = generateStoragePath(
        testDir,
        '12345',
        'https://example.com/image.jpg',
        'image/jpeg',
      );
      const path2 = generateStoragePath(
        testDir,
        '12345',
        'https://example.com/image.jpg',
        'image/jpeg',
      );
      expect(path1).toBe(path2);
    });

    it('should generate different paths for different URLs', () => {
      const path1 = generateStoragePath(
        testDir,
        '12345',
        'https://example.com/image1.jpg',
        'image/jpeg',
      );
      const path2 = generateStoragePath(
        testDir,
        '12345',
        'https://example.com/image2.jpg',
        'image/jpeg',
      );
      expect(path1).not.toBe(path2);
    });

    it('should use correct extension from content type', () => {
      const jpegPath = generateStoragePath(
        testDir,
        '12345',
        'https://example.com/image',
        'image/jpeg',
      );
      const pngPath = generateStoragePath(
        testDir,
        '12345',
        'https://example.com/image',
        'image/png',
      );
      expect(jpegPath).toMatch(/\.jpg$/);
      expect(pngPath).toMatch(/\.png$/);
    });

    it('should include storeId in path', () => {
      const path = generateStoragePath(
        testDir,
        'store-123',
        'https://example.com/image.jpg',
        'image/jpeg',
      );
      expect(path).toContain('store-123');
    });

    it("should handle Macy's .tif URL returning JPEG", () => {
      // Real-world case: URL has .tif but server returns image/jpeg
      const path = generateStoragePath(
        testDir,
        '8333',
        'https://slimages.macysassets.com/is/image/MCY/products/2/optimized/31898232_fpx.tif',
        'image/jpeg',
      );
      expect(path).toMatch(/\.jpg$/);
      expect(path).toContain('8333');
    });
  });

  describe('storeImage', () => {
    it('should store stream to file', async () => {
      const testData = Buffer.from('test image data');
      const stream = Readable.from(testData);
      const storagePath = join(testDir, 'test-store', 'test-image.jpg');

      const result = await storeImage(storagePath, stream);

      expect(result.storagePath).toBe(storagePath);
      expect(result.sizeBytes).toBe(testData.length);
      expect(existsSync(storagePath)).toBe(true);
    });

    it('should create directories recursively', async () => {
      const testData = Buffer.from('nested image data');
      const stream = Readable.from(testData);
      const storagePath = join(testDir, 'deep', 'nested', 'path', 'image.png');

      const result = await storeImage(storagePath, stream);

      expect(existsSync(storagePath)).toBe(true);
      expect(result.sizeBytes).toBe(testData.length);
    });
  });

  describe('imageExists', () => {
    it('should return true for existing file', () => {
      const filePath = join(testDir, 'exists-test.jpg');
      writeFileSync(filePath, 'test');

      expect(imageExists(filePath)).toBe(true);
    });

    it('should return false for non-existing file', () => {
      const filePath = join(testDir, 'does-not-exist.jpg');
      expect(imageExists(filePath)).toBe(false);
    });
  });

  describe('getStoredImageSize', () => {
    it('should return size for existing file', () => {
      const filePath = join(testDir, 'size-test.jpg');
      const data = 'test data for size';
      writeFileSync(filePath, data);

      expect(getStoredImageSize(filePath)).toBe(data.length);
    });

    it('should return undefined for non-existing file', () => {
      const filePath = join(testDir, 'no-size.jpg');
      expect(getStoredImageSize(filePath)).toBeUndefined();
    });
  });
});
