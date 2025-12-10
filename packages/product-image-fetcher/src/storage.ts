import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { getExtensionFromContentType } from './validation.js';

/**
 * Result of storing an image
 */
export interface StorageResult {
  /**
   * Full path where image was stored
   */
  storagePath: string;

  /**
   * Size of stored image in bytes
   */
  sizeBytes: number;
}

/**
 * Generate a deterministic storage path for an image
 * Path format: {basePath}/{storeId}/{hash}.{ext}
 *
 * @param basePath - Base storage directory
 * @param storeId - Store ID for organization
 * @param imageUrl - Original image URL (used for hash)
 * @param contentType - Content type to determine extension
 * @returns Full storage path
 */
export function generateStoragePath(
  basePath: string,
  storeId: string,
  imageUrl: string,
  contentType: string,
): string {
  // Create SHA-256 hash of image URL, truncated to 16 chars
  const hash = createHash('sha256').update(imageUrl).digest('hex').slice(0, 16);

  const extension = getExtensionFromContentType(contentType);

  return join(basePath, storeId, `${hash}.${extension}`);
}

/**
 * Ensure directory exists for a file path
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Store an image stream to local filesystem
 *
 * @param storagePath - Full path to store the image
 * @param stream - Readable stream of image data
 * @returns Storage result with path and size
 */
export async function storeImage(storagePath: string, stream: Readable): Promise<StorageResult> {
  ensureDirectoryExists(storagePath);

  const writeStream = createWriteStream(storagePath);

  await pipeline(stream, writeStream);

  // Get file size after writing
  const stats = statSync(storagePath);

  return {
    storagePath,
    sizeBytes: stats.size,
  };
}

/**
 * Check if an image already exists at the storage path
 */
export function imageExists(storagePath: string): boolean {
  return existsSync(storagePath);
}

/**
 * Get size of existing stored image
 */
export function getStoredImageSize(storagePath: string): number | undefined {
  try {
    const stats = statSync(storagePath);
    return stats.size;
  } catch {
    return undefined;
  }
}
