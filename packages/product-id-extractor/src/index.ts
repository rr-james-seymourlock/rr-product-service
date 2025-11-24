// Main extraction functions
export { extractIdsFromUrlComponents, patternExtractor } from './extractor';

// Configuration
export { config } from './config';

// Types and schemas
export type { ProductIds, ExtractIdsInput } from './types';
export {
  extractIdsInputSchema,
  productIdSchema,
  productIdsSchema,
  patternExtractorInputSchema,
} from './types';

// Errors
export {
  PatternExtractionError,
  PatternExtractionTimeoutError,
  UrlProcessingError,
} from './errors';

// Logger
export { createLogger, logger } from './logger';
