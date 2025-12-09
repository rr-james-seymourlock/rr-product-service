import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import {
  ApiRequestError,
  ApiResponseError,
  ConfigurationError,
  InvalidInputError,
  ProductNotFoundError,
  convertAsins,
} from '@rr/asin-converter';

import {
  type ConversionResult,
  type ConvertAsinResponse,
  type ErrorResponse,
  convertAsinRequestSchema,
  convertAsinResponseSchema,
} from './contracts';
import { logger } from './logger';

/**
 * Process a single ASIN conversion with error handling
 *
 * @param asin - ASIN to convert
 * @param config - Synccentric API configuration
 * @returns ConversionResult with success or failure
 */
async function processAsin(
  asin: string,
  config: { host: string; authKey: string; timeout: number },
): Promise<ConversionResult> {
  try {
    const identifiers = await convertAsins([asin], config);

    return {
      asin,
      identifiers,
      success: true,
    };
  } catch (error) {
    // Handle known ASIN converter errors
    if (error instanceof ProductNotFoundError) {
      return {
        asin,
        error: 'ProductNotFoundError',
        message: `Product not found for ASIN: ${asin}`,
        success: false,
      };
    }

    if (error instanceof InvalidInputError) {
      return {
        asin,
        error: 'InvalidInputError',
        message: error.message,
        success: false,
      };
    }

    if (error instanceof ApiRequestError || error instanceof ApiResponseError) {
      return {
        asin,
        error: error.name,
        message: error.message,
        success: false,
      };
    }

    // Handle unexpected errors
    return {
      asin,
      error: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false,
    };
  }
}

/**
 * Convert ASINs to product identifiers handler
 *
 * Accepts an array of ASINs in the request body and converts them to
 * product identifiers (UPC, SKU, MPN) using the Synccentric API via @rr/asin-converter.
 * Each ASIN is processed independently with per-item error handling.
 *
 * Request Body:
 * - asins (required): Array of Amazon ASINs to convert (1-10 ASINs)
 *
 * @param event - API Gateway event with JSON body
 * @returns API Gateway response with per-item conversion results
 */
export const convertAsinHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug({ path: event.path, body: event.body }, 'ASIN conversion requested');

    // Parse and validate request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { asins } = convertAsinRequestSchema.parse(requestBody);

    logger.info({ asins, count: asins.length }, 'Converting ASINs to product identifiers');

    // Validate required environment variables
    const synccentricHost = process.env.SYNCCENTRIC_HOST;
    const synccentricAuthKey = process.env.SYNCCENTRIC_AUTH_KEY;

    if (!synccentricHost || !synccentricAuthKey) {
      throw new ConfigurationError('Missing required Synccentric API configuration');
    }

    // Process all ASINs in parallel
    const results = await Promise.all(
      asins.map((asin) =>
        processAsin(asin, {
          host: synccentricHost,
          authKey: synccentricAuthKey,
          timeout: 10000,
        }),
      ),
    );

    // Calculate summary statistics in a single pass
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
        total: asins.length,
        successful,
        failed,
      },
      'ASIN conversion completed',
    );

    // Build response
    const response: ConvertAsinResponse = {
      results,
      total: asins.length,
      successful,
      failed,
    };

    // Validate response only in development (skip in production for performance)
    if (process.env['NODE_ENV'] === 'development') {
      convertAsinResponseSchema.parse(response);
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

    // Handle configuration errors
    if (error instanceof ConfigurationError) {
      logger.error(
        {
          error: error.message,
        },
        'Configuration error',
      );

      const errorResponse: ErrorResponse = {
        error: error.name,
        message: error.message,
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

    // Handle all other errors
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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

export const handler = middy(convertAsinHandler).use(httpJsonBodyParser()).use(httpErrorHandler());
