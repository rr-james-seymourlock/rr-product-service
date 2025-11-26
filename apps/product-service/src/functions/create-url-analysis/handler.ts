import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { parseUrlComponents } from '@rr/url-parser';

import {
  type AnalysisResult,
  type CreateUrlAnalysisResponse,
  type ErrorResponse,
  type UrlItem,
  createUrlAnalysisRequestSchema,
  createUrlAnalysisResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Process a single URL and return result (success or failure)
 */
async function processUrl(item: UrlItem): Promise<AnalysisResult> {
  try {
    const { url, storeId } = item;

    // Parse URL components
    const urlComponents = parseUrlComponents(url);

    // Extract product IDs
    const productIds = extractIdsFromUrlComponents({ urlComponents, storeId });

    return {
      url,
      productIds,
      count: productIds.length,
      success: true,
    };
  } catch (error) {
    // Return failure result instead of throwing
    return {
      url: item.url,
      error: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * URL analysis handler
 *
 * Accepts an array of URLs (with optional storeIds) in the request body,
 * processes them in parallel, and returns results for each URL.
 * Handles partial failures gracefully - some URLs may succeed while others fail.
 *
 * Request Body:
 * - urls (required): Array of URL objects (1-100 items)
 *   - url (required): The product URL to analyze
 *   - storeId (optional): Store ID to use for specific extraction patterns
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with results
 */
export const createUrlAnalysisHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'URL analysis requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { urls } = createUrlAnalysisRequestSchema.parse(requestBody);

    logger.info({ count: urls.length }, 'Processing URL analysis');

    // Process all URLs in parallel
    const startTime = Date.now();
    const results = await Promise.all(urls.map(processUrl));
    const durationMs = Date.now() - startTime;

    // Calculate summary statistics
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info(
      {
        total: urls.length,
        successful,
        failed,
        durationMs,
      },
      'URL analysis completed',
    );

    // Build and validate response
    const response: CreateUrlAnalysisResponse = {
      results,
      total: urls.length,
      successful,
      failed,
    };

    const validatedResponse = createUrlAnalysisResponseSchema.parse(response);

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
      'Failed to analyze URL',
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

export const handler = middy(createUrlAnalysisHandler)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
