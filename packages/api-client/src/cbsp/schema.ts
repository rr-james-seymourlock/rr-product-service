import { z } from 'zod';

/**
 * Schema for store attributes
 * We only care about productSearchEnabled, but passthrough allows other fields
 */
export const storeAttributesSchema = z
  .object({
    productSearchEnabled: z.boolean(),
  })
  .passthrough();

export type StoreAttributes = z.infer<typeof storeAttributesSchema>;

/**
 * Schema for individual store entry in CBSP response
 */
export const storeEntrySchema = z.object({
  id: z.number(),
  name: z.string(),
  attributes: storeAttributesSchema,
});

/**
 * Schema for CBSP store list API response
 *
 * Example response:
 * {
 *   "@rows": "4000",
 *   "@total": "4000",
 *   "store": [{
 *     "id": 4626,
 *     "name": "Kohl's",
 *     "attributes": { "productSearchEnabled": true, ... }
 *   }, ...]
 * }
 */
export const cbspStoreListResponseSchema = z.object({
  '@rows': z.string(),
  '@total': z.string(),
  store: z.array(storeEntrySchema),
});

export type CbspStoreListResponse = z.infer<typeof cbspStoreListResponseSchema>;
export type StoreEntry = z.infer<typeof storeEntrySchema>;
