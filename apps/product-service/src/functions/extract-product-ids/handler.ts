import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { parseUrlComponents } from '@rr/url-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import {
  extractProductIdsRequestSchema,
  extractProductIdsResponseSchema,
  type ErrorResponse,
  type ExtractProductIdsResponse,
} from './contracts';
import { logger } from './logger';

/**
 * Extract product IDs handler
 *
 * Accepts a URL (and optional storeId) as query parameters, parses the URL,
 * extracts product IDs, and returns them in the response.
 *
 * Query Parameters:
 * - url (required): The product URL to extract IDs from
 * - storeId (optional): Store ID to use for extraction patterns
 *
 * @param event - API Gateway event with query parameters
 * @returns API Gateway response with extracted product IDs or error
 */
export const extractProductIdsHandler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  try {
    logger.debug({ path: event.path, queryStringParameters: event.queryStringParameters }, 'Extract product IDs requested');

    // Validate query parameters
    const { url, storeId } = extractProductIdsRequestSchema.parse(event.queryStringParameters);

    logger.info({ url, storeId }, 'Parsing URL and extracting product IDs');

    // Parse URL components
    const urlComponents = parseUrlComponents(url);

    logger.debug(
      {
        domain: urlComponents.domain,
        pathname: urlComponents.pathname,
        search: urlComponents.search,
      },
      'URL parsed successfully',
    );

    // Extract product IDs
    const productIds = extractIdsFromUrlComponents({ urlComponents, storeId });

    logger.info(
      {
        url,
        domain: urlComponents.domain,
        count: productIds.length,
        storeId,
      },
      'Product IDs extracted successfully',
    );

    // Build and validate response
    const response: ExtractProductIdsResponse = {
      url,
      productIds,
      count: productIds.length,
    };

    const validatedResponse = extractProductIdsResponseSchema.parse(response);

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
          queryStringParameters: event.queryStringParameters,
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
        queryStringParameters: event.queryStringParameters,
      },
      'Failed to extract product IDs',
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

export const handler = middy(extractProductIdsHandler).use(httpErrorHandler());
