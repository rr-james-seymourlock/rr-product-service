export { normalizeCartEvent } from './normalizer.js';
export type { RawCartEvent, RawProduct, CartProduct, NormalizeCartEventOptions } from './types.js';
export { RawCartEventSchema, RawProductSchema, CartProductSchema } from './types.js';

// Re-export base type for consumers that need it
export type { BaseNormalizedProduct } from '@rr/shared/types';
export { BaseNormalizedProductSchema } from '@rr/shared/types';
