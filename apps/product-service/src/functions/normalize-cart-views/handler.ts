import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { type RawCartEvent, normalizeCartEvent } from '@rr/cart-normalizer';
import { coerceStoreId } from '@rr/shared/utils';

import {
  type ErrorResponse,
  type NormalizationResult,
  type NormalizeCartViewsResponse,
  normalizeCartViewsRequestSchema,
  normalizeCartViewsResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Process a single cart event and return result (success or failure)
 */
async function processCartEvent(event: RawCartEvent): Promise<NormalizationResult> {
  try {
    // Normalize the cart event
    const products = normalizeCartEvent(event);

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
 * Normalize cart views handler
 *
 * Accepts an array of raw cart view events in the request body,
 * normalizes them in parallel, and returns results for each event.
 * Handles partial failures gracefully - some events may succeed while others fail.
 *
 * Request Body:
 * - events (required): Array of raw cart event objects (1-100 items)
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with results
 */
export const normalizeCartViewsHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'Cart view normalization requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { events } = normalizeCartViewsRequestSchema.parse(requestBody);

    logger.info({ count: events.length }, 'Normalizing cart views');

    // Process all cart events in parallel (order is preserved by Promise.all)
    const startTime = Date.now();
    const results = await Promise.all(events.map((e) => processCartEvent(e)));
    const durationMs = Date.now() - startTime;

    // Calculate summary statistics
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalProducts = results
      .filter((r): r is Extract<NormalizationResult, { success: true }> => r.success)
      .reduce((sum, r) => sum + r.productCount, 0);

    logger.info(
      {
        total: events.length,
        successful,
        failed,
        totalProducts,
        durationMs,
      },
      'Cart view normalization completed',
    );

    // Build and validate response
    const response: NormalizeCartViewsResponse = {
      results,
      total: events.length,
      successful,
      failed,
      totalProducts,
    };

    const validatedResponse = normalizeCartViewsResponseSchema.parse(response);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedResponse),
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      logger.warn(
        {
          errors: error.issues,
          body: event.body,
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
        body: event.body,
      },
      'Failed to normalize cart views',
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

export const handler = middy(normalizeCartViewsHandler)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
