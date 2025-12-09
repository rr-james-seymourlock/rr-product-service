import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { type RawProductViewEvent, normalizeProductViewEvent } from '@rr/product-event-normalizer';
import { coerceStoreId } from '@rr/shared/utils';

import {
  type ErrorResponse,
  type NormalizationResult,
  type NormalizeProductViewsResponse,
  normalizeProductViewsRequestSchema,
  normalizeProductViewsResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Process a single product view event and return result (success or failure)
 */
function processProductViewEvent(event: RawProductViewEvent): NormalizationResult {
  try {
    // Normalize the product view event
    const products = normalizeProductViewEvent(event);

    return {
      storeId: coerceStoreId(event.store_id),
      storeName: event.store_name,
      products: products as NormalizationResult extends { products: infer P } ? P : never,
      productCount: products.length,
      success: true,
    };
  } catch (error) {
    // Return failure result instead of throwing
    return {
      error: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Normalize product views handler
 *
 * Accepts an array of raw product view events in the request body,
 * normalizes them in parallel, and returns results for each event.
 * Handles partial failures gracefully - some events may succeed while others fail.
 *
 * Request Body:
 * - events (required): Array of raw product view event objects (1-100 items)
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with results
 */
export const normalizeProductViewsHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'Product view normalization requested');

    // Parse and validate request body
    // Note: httpJsonBodyParser middleware parses JSON, but we handle both cases
    // for direct Lambda invocation (string) vs middleware-processed (object)
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { events } = normalizeProductViewsRequestSchema.parse(requestBody);

    logger.info({ count: events.length }, 'Normalizing product views');

    // Process all product view events (synchronous - no I/O operations)
    const startTime = Date.now();
    const results = events.map((e) => processProductViewEvent(e));
    const durationMs = Date.now() - startTime;

    // Calculate summary statistics in a single pass
    const { successful, failed, totalProducts } = results.reduce(
      (acc, r) => {
        if (r.success) {
          acc.successful++;
          acc.totalProducts += r.productCount;
        } else {
          acc.failed++;
        }
        return acc;
      },
      { successful: 0, failed: 0, totalProducts: 0 },
    );

    logger.info(
      {
        total: events.length,
        successful,
        failed,
        totalProducts,
        durationMs,
      },
      'Product view normalization completed',
    );

    // Build response
    const response: NormalizeProductViewsResponse = {
      results,
      total: events.length,
      successful,
      failed,
      totalProducts,
    };

    // Validate response only in development (skip in production for performance)
    if (process.env['NODE_ENV'] === 'development') {
      normalizeProductViewsResponseSchema.parse(response);
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
      'Failed to normalize product views',
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

export const handler = middy(normalizeProductViewsHandler)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
