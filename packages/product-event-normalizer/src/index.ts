export { normalizeProductViewEvent } from './normalizer.js';
export type {
  RawProductViewEvent,
  ToolbarOffer,
  AppOffer,
  NormalizedProduct,
  NormalizeProductViewEventOptions,
} from './types.js';
export {
  RawProductViewEventSchema,
  ToolbarOfferSchema,
  AppOfferSchema,
  NormalizedProductSchema,
} from './types.js';

// Re-export base type for consumers that need it
export type { BaseNormalizedProduct } from '@rr/shared/types';
export { BaseNormalizedProductSchema } from '@rr/shared/types';
