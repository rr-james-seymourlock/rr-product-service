import { z } from 'zod';
import { urlComponentsSchema } from '@/lib/parseUrlComponents';

/**
 * Schema for extractIdsFromUrlComponents input validation.
 * Validates URL components and optional store ID.
 */
export const extractIdsInputSchema = z.object({
  urlComponents: urlComponentsSchema,
  storeId: z
    .string()
    .min(1, 'Store ID cannot be empty')
    .max(100, 'Store ID is too long')
    .optional(),
});

export type ExtractIdsInput = z.infer<typeof extractIdsInputSchema>;

/**
 * Schema for individual product ID validation.
 * Product IDs must be 1-24 characters, alphanumeric with dashes/underscores.
 */
export const productIdSchema = z
  .string()
  .min(1, 'Product ID cannot be empty')
  .max(24, 'Product ID cannot exceed 24 characters')
  .regex(
    /^[\w-]+$/,
    'Product ID must contain only alphanumeric characters, dashes, or underscores',
  );

export type ProductId = z.infer<typeof productIdSchema>;

/**
 * Schema for product IDs array output validation.
 * Validates array of product IDs with maximum limit.
 */
export const productIdsSchema = z
  .array(productIdSchema)
  .max(12, 'Cannot extract more than 12 product IDs')
  .readonly();

export type ProductIds = z.infer<typeof productIdsSchema>;

/**
 * Schema for patternExtractor input validation.
 * Validates source string and RegExp pattern.
 */
export const patternExtractorInputSchema = z.object({
  source: z.string().max(10000, 'Source string is too long'),
  pattern: z.instanceof(RegExp, {
    message: 'Pattern must be a RegExp object',
  }),
});

export type PatternExtractorInput = z.infer<typeof patternExtractorInputSchema>;
