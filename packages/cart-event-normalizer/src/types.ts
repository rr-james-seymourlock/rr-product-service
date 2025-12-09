import { z } from 'zod';

import { BaseNormalizedProductSchema } from '@rr/shared/types';

/**
 * Raw product from cart event product_list
 */
export const RawProductSchema = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
  image_url: z.string().optional(),
  item_price: z.number().optional(),
  line_total: z.number().optional(),
  quantity: z.number().optional(),
});

export type RawProduct = z.infer<typeof RawProductSchema>;

/**
 * Raw cart event from apps/extensions
 * Supports both App (string store_id) and Toolbar (number store_id) sources
 */
export const RawCartEventSchema = z.object({
  // Store identification - can be string (App) or number (Toolbar)
  store_id: z.union([z.string(), z.number()]).optional(),
  store_name: z.string().optional(),

  // Product list
  product_list: z.array(RawProductSchema).default([]),

  // Cart totals
  cart_total: z.number().optional(),
  cart_total_qty: z.number().optional(),
  currency: z.string().optional(),

  // Source metadata (not used in normalization but validated)
  app_version: z.string().optional(),
  application_type: z.string().optional(),
  application_subtype: z.string().optional(),
  browser: z.string().optional(),
  browser_agent: z.string().optional(),
  client: z.string().optional(),
  platform: z.string().optional(),
  page_url: z.string().optional(),
  url: z.string().optional(),
  session_id: z.number().optional(),
  tenant: z.string().optional(),
  timestamp: z.number().optional(),
  toolbarid: z.number().optional(),
  tracking_ticket: z.string().optional(),
  free_shipping: z.boolean().nullable().optional(),

  // App-specific fields
  member_guid: z.string().optional(),
  user_id: z.string().optional(),
  visit_id: z.string().optional(),
  device_platform: z.string().optional(),
  os_version: z.string().optional(),
  created_ts: z.string().optional(),
  created_ts_ms: z.string().optional(),

  // Device context (App only)
  context_device: z
    .object({
      id: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
      adTrackingEnabled: z.boolean().optional(),
      advertisingId: z.string().optional(),
    })
    .optional(),
  context_location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
  context_network: z
    .object({
      carrier: z.string().optional(),
      cellular: z.boolean().optional(),
      wifi: z.boolean().optional(),
      bluetooth: z.boolean().optional(),
    })
    .optional(),
  context_os: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  context_timezone: z.string().optional(),
  device_ids: z.record(z.string(), z.string()).optional(),
  app_install_ts: z.number().optional(),
});

export type RawCartEvent = z.infer<typeof RawCartEventSchema>;

/**
 * Normalized cart product output
 * Extends BaseNormalizedProductSchema with cart-specific fields
 */
export const CartProductSchema = BaseNormalizedProductSchema.extend({
  /**
   * Quantity of this product in the cart
   */
  quantity: z.number().optional(),

  /**
   * Line total (price * quantity)
   */
  lineTotal: z.number().optional(),
});

export type CartProduct = z.infer<typeof CartProductSchema>;

/**
 * Options for normalizeCartEvent
 */
export interface NormalizeCartEventOptions {
  /**
   * Whether to validate input with Zod schema
   * @default false in production, true in development
   */
  validate?: boolean;

  /**
   * Whether to extract product IDs from URLs
   * @default true
   */
  extractProductIds?: boolean;
}
