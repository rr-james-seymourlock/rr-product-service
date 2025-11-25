import type { z } from 'zod';

import type { extractProductIdsRequestSchema, extractProductIdsResponseSchema } from './schema';

/**
 * Extract product IDs request query parameters
 */
export interface ExtractProductIdsRequest {
  url: string;
  storeId?: string;
}

/**
 * Extract product IDs response body
 */
export interface ExtractProductIdsResponse {
  url: string;
  productIds: readonly string[];
  count: number;
}

/**
 * Error response body
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Zod-inferred types from schemas (ensures types stay in sync with runtime validation)
 */
export type ExtractProductIdsRequestValidated = z.infer<typeof extractProductIdsRequestSchema>;
export type ExtractProductIdsResponseValidated = z.infer<typeof extractProductIdsResponseSchema>;
