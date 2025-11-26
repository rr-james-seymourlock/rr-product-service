import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { healthResponseSchema, type HealthResponse } from '../../contracts/health';
import { logger } from './logger';

/**
 * Health check handler
 *
 * Returns the current health status of the service.
 * Used for monitoring, load balancer health checks, and readiness probes.
 *
 * @param _event - API Gateway event (unused for health checks)
 * @returns API Gateway response with health status
 */
export const healthCheckHandler = (_event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  logger.debug('Health check requested');

  const response: HealthResponse = {
    status: 'healthy',
    service: 'rr-product-service',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Validate response matches schema
  const validatedResponse = healthResponseSchema.parse(response);

  logger.info(
    {
      status: validatedResponse.status,
      version: validatedResponse.version,
      environment: validatedResponse.environment,
    },
    'Health check successful',
  );

  return {
    statusCode: 200,
    body: JSON.stringify(validatedResponse),
  };
};

export const handler = middy(healthCheckHandler).use(httpErrorHandler());
