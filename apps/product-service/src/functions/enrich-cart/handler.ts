import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { enrichCart } from '@rr/cart-enricher';

import {
  type EnrichCartResponse,
  type ErrorResponse,
  enrichCartRequestSchema,
  enrichCartResponseSchema,
} from './contracts.js';
import { logger } from './logger.js';

/**
 * Enrich cart handler
 *
 * Accepts normalized cart items and product views in the request body,
 * matches cart items to products using multiple strategies, and returns
 * enriched cart items with combined data and confidence scores.
 *
 * Request Body:
 * - cart (required): Array of normalized cart products (1-50 items)
 * - products (required): Array of normalized products for matching (max 50)
 * - options (optional): Enrichment options (minConfidence, titleSimilarityThreshold)
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with enriched cart
 */
export const enrichCartHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'Cart enrichment requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { cart, products, options } = enrichCartRequestSchema.parse(requestBody);

    logger.info(
      {
        cartItems: cart.length,
        products: products.length,
        minConfidence: options?.minConfidence ?? 'low',
      },
      'Enriching cart',
    );

    // Enrich the cart
    const startTime = Date.now();
    const enrichedCart = enrichCart(cart, products, {
      ...(options?.minConfidence !== undefined && { minConfidence: options.minConfidence }),
      ...(options?.titleSimilarityThreshold !== undefined && {
        titleSimilarityThreshold: options.titleSimilarityThreshold,
      }),
    });
    const durationMs = Date.now() - startTime;

    logger.info(
      {
        totalItems: enrichedCart.summary.totalItems,
        matchedItems: enrichedCart.summary.matchedItems,
        matchRate: enrichedCart.summary.matchRate.toFixed(1),
        durationMs,
      },
      'Cart enrichment completed',
    );

    // Build response
    const response: EnrichCartResponse = {
      storeId: enrichedCart.storeId,
      items: enrichedCart.items as EnrichCartResponse['items'],
      summary: enrichedCart.summary,
      enrichedAt: enrichedCart.enrichedAt,
      durationMs,
    };

    // Validate response only in development
    if (process.env['NODE_ENV'] === 'development') {
      enrichCartResponseSchema.parse(response);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    // Handle store ID mismatch errors
    if (error instanceof Error && error.message.includes('Store ID mismatch')) {
      logger.warn({ error: error.message }, 'Store ID mismatch');

      const errorResponse: ErrorResponse = {
        error: 'StoreIdMismatch',
        message: error.message,
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
      'Failed to enrich cart',
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

export const handler = middy(enrichCartHandler).use(httpJsonBodyParser()).use(httpErrorHandler());
