export { enrichCart } from './enricher.js';

export type {
  EnrichedCart,
  EnrichedCartItem,
  EnrichCartOptions,
  EnrichmentSummary,
  FieldSource,
  FieldSources,
  MatchConfidence,
  MatchedSignal,
  MatchedVariant,
  MatchMethod,
  MatchMethodNonNull,
} from './types.js';

export {
  EnrichedCartItemSchema,
  EnrichedCartSchema,
  EnrichmentSummarySchema,
  FieldSourceSchema,
  FieldSourcesSchema,
  MatchConfidenceSchema,
  MatchedSignalSchema,
  MatchedVariantSchema,
  MatchMethodSchema,
  MatchMethodNonNullSchema,
} from './types.js';

// Re-export input types for consumers
export type { CartProduct } from '@rr/cart-event-normalizer/types';
export type { NormalizedProduct, ProductVariant } from '@rr/product-event-normalizer/types';
