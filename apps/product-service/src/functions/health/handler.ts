import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const healthCheckHandler = (_event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'healthy',
      service: 'rr-product-service',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
  };
};

export const handler = middy(healthCheckHandler).use(httpErrorHandler());
