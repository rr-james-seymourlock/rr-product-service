export { normalizeProductViewEvent } from './normalizer.js';
export type {
  RawProductViewEvent,
  ToolbarOffer,
  AppOffer,
  NormalizedProduct,
  ProductVariant,
  NormalizeProductViewEventOptions,
} from './types.js';
export {
  RawProductViewEventSchema,
  ToolbarOfferSchema,
  AppOfferSchema,
  NormalizedProductSchema,
  ProductVariantSchema,
} from './types.js';

// Re-export ProductIds type for consumers
export type { ProductIds } from '@rr/shared/types';
export { ProductIdsSchema } from '@rr/shared/types';
