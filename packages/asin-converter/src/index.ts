/**
 * @rr/asin-converter
 *
 * Convert ASIN identifiers to product IDs (UPC, SKU, MPN) using the Synccentric API
 */

// Main converter function
export { convertAsins } from './converter.js';

// Types and schemas
export type {
  AsinConverterConfig,
  ConvertAsinsInput,
  ConvertAsinsOutput,
  ProductIdentifiers,
  SynccentricError,
  SynccentricProductAttributes,
  SynccentricProductData,
  SynccentricResponse,
} from './types.js';

export {
  ConvertAsinsInputSchema,
  ConvertAsinsOutputSchema,
  ProductIdentifiersSchema,
  SynccentricErrorSchema,
  SynccentricProductAttributesSchema,
  SynccentricProductDataSchema,
  SynccentricResponseSchema,
} from './types.js';

// Error classes
export {
  ApiRequestError,
  ApiResponseError,
  AsinConverterError,
  ConfigurationError,
  InvalidInputError,
  ProductNotFoundError,
} from './errors.js';

// Logger (for creating child loggers if needed)
export { logger } from './logger.js';
