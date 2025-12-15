import { z } from 'zod';

/**
 * Schema for individual store entry in CBSP response
 */
export const storeEntrySchema = z.object({
  id: z.number(),
  name: z.string(),
});

/**
 * Schema for CBSP store list API response
 *
 * Example response:
 * {
 *   "@rows": "803",
 *   "@total": "803",
 *   "store": [{ "id": 4626, "name": "Kohl's" }, { "id": 16400, "name": "Walmart" }, ...]
 * }
 */
export const cbspStoreListResponseSchema = z.object({
  '@rows': z.string(),
  '@total': z.string(),
  store: z.array(storeEntrySchema),
});

export type CbspStoreListResponse = z.infer<typeof cbspStoreListResponseSchema>;
export type StoreEntry = z.infer<typeof storeEntrySchema>;
