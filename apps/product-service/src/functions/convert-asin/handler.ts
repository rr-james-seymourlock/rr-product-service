import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import {
  convertAsins,
  ProductNotFoundError,
  ApiRequestError,
  ApiResponseError,
  ConfigurationError,
  InvalidInputError,
} from '@rr/asin-converter';

import {
  type ConvertAsinResponse,
  type ErrorResponse,
  convertAsinRequestSchema,
  convertAsinResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Convert ASIN handler
 *
 * Accepts an array of ASINs in the request body and converts them to
 * GTINs (UPC, SKU, MPN) using the Synccentric API via @rr/asin-converter.
 *
 * Request Body:
 * - asins (required): Array of Amazon ASINs to convert (1-10 ASINs)
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with converted GTINs or error
 */
export const convertAsinHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'ASIN conversion requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { asins } = convertAsinRequestSchema.parse(requestBody);

    logger.info({ asins, count: asins.length }, 'Converting ASINs to GTINs');

    // Validate required environment variables
    const synccentricHost = process.env.SYNCCENTRIC_HOST;
    const synccentricAuthKey = process.env.SYNCCENTRIC_AUTH_KEY;

    if (!synccentricHost || !synccentricAuthKey) {
      throw new ConfigurationError('Missing required Synccentric API configuration');
    }

    // Convert ASINs to GTINs
    const gtins = await convertAsins(asins, {
      host: synccentricHost,
      authKey: synccentricAuthKey,
      timeout: 10000,
    });

    logger.info(
      {
        asins,
        gtins,
        count: gtins.length,
      },
      'ASINs converted successfully',
    );

    // Build and validate response
    const response: ConvertAsinResponse = {
      asins,
      gtins,
      count: gtins.length,
    };

    const validatedResponse = convertAsinResponseSchema.parse(response);

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

    // Handle product not found
    if (error instanceof ProductNotFoundError) {
      logger.info(
        {
          asins: error.asins,
        },
        'Product not found for ASINs',
      );

      const errorResponse: ErrorResponse = {
        error: 'ProductNotFoundError',
        message: error.message,
        statusCode: 404,
      };

      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    // Handle ASIN converter errors
    if (
      error instanceof InvalidInputError ||
      error instanceof ConfigurationError ||
      error instanceof ApiRequestError ||
      error instanceof ApiResponseError
    ) {
      logger.error(
        {
          error: error.message,
          errorType: error.name,
          body: event.body,
        },
        'ASIN conversion failed',
      );

      const errorResponse: ErrorResponse = {
        error: error.name,
        message: error.message,
        statusCode:
          error instanceof ConfigurationError
            ? 500
            : error instanceof ApiRequestError || error instanceof ApiResponseError
              ? 502
              : 400,
      };

      return {
        statusCode: errorResponse.statusCode,
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
      'Failed to convert ASINs',
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

export const handler = middy(convertAsinHandler)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
