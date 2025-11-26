import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { parseUrlComponents } from '@rr/url-parser';

import {
  type CreateUrlAnalysisResponse,
  type ErrorResponse,
  createUrlAnalysisRequestSchema,
  createUrlAnalysisResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Create URL analysis handler
 *
 * Accepts a URL (and optional storeId) in the request body, parses the URL,
 * extracts product IDs, and returns them in the response.
 *
 * Request Body:
 * - url (required): The product URL to analyze and extract IDs from
 * - storeId (optional): Store ID to use for specific extraction patterns
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with extracted product IDs or error
 */
export const createUrlAnalysisHandler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'URL analysis requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { url, storeId } = createUrlAnalysisRequestSchema.parse(requestBody);

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
    const response: CreateUrlAnalysisResponse = {
      url,
      productIds,
      count: productIds.length,
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
