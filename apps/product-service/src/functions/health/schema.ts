import { z } from 'zod';

/**
 * Health check response schema
 *
 * Validates the structure and types of health check responses.
 * Ensures consistency across all health check endpoints.
 */
export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  service: z.string().min(1, 'Service name is required'),
  timestamp: z.string().datetime({
    message: 'Timestamp must be in ISO 8601 format',
  }),
  version: z.string().min(1, 'Version is required'),
  environment: z.string().min(1, 'Environment is required'),
});
