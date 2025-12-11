export { enrichCart } from './enricher.js';

export type {
  EnrichedCart,
  EnrichedCartItem,
  EnrichCartOptions,
  EnrichmentSummary,
  FieldSource,
  FieldSources,
  MatchConfidence,
  MatchedVariant,
  MatchMethod,
} from './types.js';

export {
  EnrichedCartItemSchema,
  EnrichedCartSchema,
  EnrichmentSummarySchema,
  FieldSourceSchema,
  FieldSourcesSchema,
  MatchConfidenceSchema,
  MatchedVariantSchema,
  MatchMethodSchema,
} from './types.js';

// Re-export input types for consumers
export type { CartProduct } from '@rr/cart-event-normalizer/types';
export type { NormalizedProduct, ProductVariant } from '@rr/product-event-normalizer/types';
