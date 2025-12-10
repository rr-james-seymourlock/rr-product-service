import { Readable } from 'node:stream';

import { createLogger } from '@rr/shared/utils';

import { type ResolvedConfig, getConfig } from './config.js';
import {
  createContentTypeError,
  createHttpError,
  createInvalidUrlError,
  createNetworkError,
  createSizeError,
} from './errors.js';
import { generateStoragePath, storeImage } from './storage.js';
import type {
  ImageFetchFailure,
  ImageFetchRequest,
  ImageFetchResult,
  ImageFetchSuccess,
  ImageFetcherOptions,
} from './types.js';
import { extractDomain, isAllowedContentType, isValidImageUrl } from './validation.js';

const logger = createLogger('product-image-fetcher');

/**
 * Build request headers for image fetch
 */
function buildHeaders(config: ResolvedConfig, productUrl: string): Record<string, string> {
  return {
    'User-Agent': config.userAgent,
    Accept: config.acceptHeader,
    Referer: productUrl,
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

/**
 * Fetch an image from a URL with appropriate headers
 */
async function fetchImage(
  imageUrl: string,
  productUrl: string,
  config: ResolvedConfig,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: buildHeaders(config, productUrl),
      signal: controller.signal,
      redirect: 'follow',
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert Response body to Node.js Readable stream
 */
function responseToStream(response: Response): Readable {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Response.body is a web ReadableStream, convert to Node.js stream
  return Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
}

/**
 * Fetch and store a single product image
 */
export async function fetchAndStoreImage(
  request: ImageFetchRequest,
  options?: ImageFetcherOptions,
): Promise<ImageFetchResult> {
  const config = getConfig(options);
  const { storeId, productUrl, imageUrl } = request;
  const domain = extractDomain(imageUrl);
  const startTime = Date.now();

  // Validate URL format
  if (!isValidImageUrl(imageUrl)) {
    const error = createInvalidUrlError(imageUrl);
    logger.error({ storeId, domain, error }, 'Invalid image URL');
    return { success: false, error };
  }

  try {
    // Fetch the image
    const response = await fetchImage(imageUrl, productUrl, config);
    const durationMs = Date.now() - startTime;

    // Handle non-2xx responses
    if (!response.ok) {
      const error = createHttpError(response.status, imageUrl, response.headers.get('Retry-After'));

      const logLevel = error.isPermanent ? 'error' : 'warn';
      logger[logLevel](
        {
          storeId,
          domain,
          statusCode: response.status,
          durationMs,
          isPermanent: error.isPermanent,
          errorCode: error.code,
        },
        `Image fetch failed: HTTP ${response.status}`,
      );

      return { success: false, error };
    }

    // Validate content type
    const contentType = response.headers.get('Content-Type') ?? '';
    if (!isAllowedContentType(contentType)) {
      const error = createContentTypeError(contentType, imageUrl);
      logger.error(
        { storeId, domain, contentType, durationMs },
        `Invalid content type: ${contentType}`,
      );
      return { success: false, error };
    }

    // Check Content-Length if available (pre-download validation)
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size)) {
        if (size < config.minSizeBytes || size > config.maxSizeBytes) {
          const error = createSizeError(size, config.minSizeBytes, config.maxSizeBytes, imageUrl);
          logger.error({ storeId, domain, sizeBytes: size, durationMs }, error.message);
          return { success: false, error };
        }
      }
    }

    // Generate storage path and store the image
    const storagePath = generateStoragePath(config.storagePath, storeId, imageUrl, contentType);
    const stream = responseToStream(response);
    const { sizeBytes } = await storeImage(storagePath, stream);

    // Post-download size validation (in case Content-Length was missing or wrong)
    if (sizeBytes < config.minSizeBytes || sizeBytes > config.maxSizeBytes) {
      const error = createSizeError(sizeBytes, config.minSizeBytes, config.maxSizeBytes, imageUrl);
      logger.error({ storeId, domain, sizeBytes, durationMs }, error.message);
      return { success: false, error };
    }

    const totalDurationMs = Date.now() - startTime;
    logger.info(
      {
        storeId,
        domain,
        contentType,
        sizeBytes,
        durationMs: totalDurationMs,
        storagePath,
      },
      'Image fetched and stored successfully',
    );

    const result: ImageFetchSuccess = {
      success: true,
      storagePath,
      contentType,
      sizeBytes,
      domain,
    };

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const fetchError = createNetworkError(error as Error, imageUrl);

    logger.warn(
      {
        storeId,
        domain,
        durationMs,
        errorCode: fetchError.code,
        errorMessage: (error as Error).message,
      },
      `Image fetch failed: ${fetchError.code}`,
    );

    const result: ImageFetchFailure = {
      success: false,
      error: fetchError,
    };

    return result;
  }
}

/**
 * Fetch and store multiple images with concurrency control
 */
export async function fetchAndStoreImages(
  requests: ImageFetchRequest[],
  options?: ImageFetcherOptions,
): Promise<ImageFetchResult[]> {
  const config = getConfig(options);
  const concurrency = config.batchConcurrency;

  const results: ImageFetchResult[] = [];

  // Process in batches with controlled concurrency
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((request) => fetchAndStoreImage(request, options)),
    );
    results.push(...batchResults);
  }

  return results;
}
