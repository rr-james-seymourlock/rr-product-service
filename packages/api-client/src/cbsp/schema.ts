import { z } from 'zod';

/**
 * Schema for store attributes object
 * productSearchEnabled is optional (defaults to false if missing)
 * passthrough allows other fields we don't care about
 */
const storeAttributesObjectSchema = z
  .object({
    productSearchEnabled: z.boolean().optional(),
  })
  .passthrough();

/**
 * Schema for store attributes
 * Some stores have attributes as a string (empty or malformed), so we handle that
 */
export const storeAttributesSchema = z.union([
  storeAttributesObjectSchema,
  z.string().transform(() => ({ productSearchEnabled: undefined })),
]);

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
