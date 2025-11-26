import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * Health check response schema with OpenAPI metadata
 */
export const healthResponseSchema = z
  .object({
    status: z.enum(['healthy', 'unhealthy']).openapi({
      description: 'Current health status of the service',
      example: 'healthy',
    }),
    service: z.string().min(1, 'Service name is required').openapi({
      description: 'Service name identifier',
      example: 'rr-product-service',
    }),
    timestamp: z
      .string()
      .datetime({
        message: 'Timestamp must be in ISO 8601 format',
      })
      .openapi({
        description: 'ISO 8601 timestamp of the health check',
        example: '2025-11-25T20:00:00.000Z',
      }),
    version: z.string().min(1, 'Version is required').openapi({
      description: 'Service version',
      example: '1.0.0',
    }),
    environment: z.string().min(1, 'Environment is required').openapi({
      description: 'Deployment environment',
      example: 'production',
    }),
  })
  .openapi('HealthResponse');

export type HealthResponse = z.infer<typeof healthResponseSchema>;
