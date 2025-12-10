import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import {
  type ImageFetchRequest,
  type ImageFetchResult as PackageResult,
  fetchAndStoreImages,
} from '@rr/product-image-fetcher';

import {
  type ErrorResponse,
  type FetchImagesResponse,
  fetchImagesRequestSchema,
  fetchImagesResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Fetch images handler
 *
 * Accepts an array of image fetch requests in the request body,
 * fetches and stores images, and returns results for each request.
 * Handles partial failures gracefully - some fetches may succeed while others fail.
 *
 * Request Body:
 * - requests (required): Array of image fetch request objects (1-100 items)
 *   - storeId: Rakuten store ID
 *   - productUrl: Product page URL (used as Referer)
 *   - imageUrl: Image URL to fetch
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with results
 */
export const fetchImagesHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'Image fetch requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { requests } = fetchImagesRequestSchema.parse(requestBody);

    logger.info({ count: requests.length }, 'Fetching images');

    // Process all image fetch requests
    const startTime = Date.now();
    const results: PackageResult[] = await fetchAndStoreImages(requests as ImageFetchRequest[]);
    const durationMs = Date.now() - startTime;

    // Calculate summary statistics
    const { successful, failed } = results.reduce(
      (acc, r) => {
        if (r.success) {
          acc.successful++;
        } else {
          acc.failed++;
        }
        return acc;
      },
      { successful: 0, failed: 0 },
    );

    logger.info(
      {
        total: requests.length,
        successful,
        failed,
        durationMs,
      },
      'Image fetch completed',
    );

    // Build response
    const response: FetchImagesResponse = {
      results: results as FetchImagesResponse['results'],
      total: requests.length,
      successful,
      failed,
    };

    // Validate response only in development
    if (process.env['NODE_ENV'] === 'development') {
      fetchImagesResponseSchema.parse(response);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      logger.warn(
        {
          errors: error.issues.slice(0, 3),
          errorCount: error.issues.length,
        },
        'Validation error',
      );

      const errorResponse: ErrorResponse = {
        error: 'ValidationError',
        message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        statusCode: 400,
      };

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    // Handle all other errors
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to fetch images',
    );

    const errorResponse: ErrorResponse = {
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse),
    };
  }
};

export const handler = middy(fetchImagesHandler).use(httpJsonBodyParser()).use(httpErrorHandler());
