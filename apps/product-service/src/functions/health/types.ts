import type { z } from 'zod';

import type { healthResponseSchema } from './schema';

/**
 * Health check response body
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  timestamp: string;
  version: string;
  environment: string;
}

/**
 * Zod-inferred type from schema (ensures types stay in sync with runtime validation)
 */
export type HealthResponseValidated = z.infer<typeof healthResponseSchema>;
