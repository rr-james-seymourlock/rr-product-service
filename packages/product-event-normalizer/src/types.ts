import { z } from 'zod';

import { BaseNormalizedProductSchema } from '@rr/shared/types';

/**
 * Toolbar offer schema (from browser extensions)
 * Uses: price, sku, url
 */
export const ToolbarOfferSchema = z.object({
  price: z.number().optional(),
  sku: z.string().optional(),
  url: z.string().optional(),
});

export type ToolbarOffer = z.infer<typeof ToolbarOfferSchema>;

/**
 * App offer schema (from mobile apps)
 * Uses: offer_amount, offer_currency, offer_sku
 */
export const AppOfferSchema = z.object({
  offer_amount: z.number().optional(),
  offer_currency: z.string().optional(),
  offer_sku: z.string().optional(),
});

export type AppOffer = z.infer<typeof AppOfferSchema>;

/**
 * Raw product view event from apps/extensions
 * Supports both Toolbar and App field naming conventions
 */
export const RawProductViewEventSchema = z.object({
  // Store identification - can be string (App) or number (Toolbar)
  store_id: z.union([z.string(), z.number()]).optional(),
  store_name: z.string().optional(),

  // Product identification
  name: z.string().optional(),
  url: z.string().optional(),
  product_url: z.string().optional(),

  // Image - Toolbar uses image_url, App uses image_url_list
  image_url: z.string().optional(),
  image_url_list: z.array(z.string()).optional(),

  // Product identifiers - Toolbar uses singular, App uses _list suffix
  sku: z.array(z.string()).optional(),
  sku_list: z.array(z.string()).optional(),
  gtin: z.array(z.string()).optional(),
  gtin_list: z.array(z.string()).optional(),
  productID: z.array(z.string()).optional(),
  productid_list: z.array(z.string()).optional(),
  mpn: z.array(z.string()).optional(),
  mpn_list: z.array(z.string()).optional(),

  // Offers - Toolbar uses offers array, App uses offer_list
  offers: z.array(ToolbarOfferSchema).optional(),
  offer_list: z.array(AppOfferSchema).optional(),

  // SKU correlation maps (Toolbar only)
  urlToSku: z.record(z.string(), z.string()).optional(),
  priceToSku: z.record(z.string(), z.string()).optional(),

  // Rich metadata
  brand: z.string().optional(),
  brand_list: z.array(z.string()).optional(),
  rating: z.number().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  breadcrumbs: z.string().optional(),
  color: z.string().optional(),
  color_list: z.array(z.string()).optional(),

  // Source metadata (not used in normalization but validated)
  app_version: z.string().optional(),
  application_type: z.string().optional(),
  application_subtype: z.string().optional(),
  browser: z.string().optional(),
  browser_agent: z.string().optional(),
  client: z.string().optional(),
  platform: z.string().optional(),
  page_url: z.string().optional(),
  session_id: z.number().optional(),
  tenant: z.string().optional(),
  timestamp: z.number().optional(),
  toolbarid: z.number().optional(),
  tracking_ticket: z.string().optional(),

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

export type RawProductViewEvent = z.infer<typeof RawProductViewEventSchema>;

/**
 * Normalized product output
 * Extends BaseNormalizedProductSchema with product view-specific fields
 */
export const NormalizedProductSchema = BaseNormalizedProductSchema.extend({
  // Extended fields for product view data
  /**
   * Product category or breadcrumbs
   */
  category: z.string().optional(),

  /**
   * Product description
   */
  description: z.string().optional(),

  /**
   * Product rating (typically 0-5)
   */
  rating: z.number().optional(),

  /**
   * Product color
   */
  color: z.string().optional(),

  // Specific identifier types (for downstream consumers that need them)
  /**
   * SKU identifiers extracted from schema.org data
   */
  skus: z.array(z.string()).readonly().optional(),

  /**
   * GTIN identifiers (UPC, EAN, ISBN) extracted from schema.org data
   */
  gtins: z.array(z.string()).readonly().optional(),

  /**
   * MPN (Manufacturer Part Number) identifiers
   */
  mpns: z.array(z.string()).readonly().optional(),
});

export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>;

/**
 * Options for normalizeProductViewEvent
 */
export interface NormalizeProductViewEventOptions {
  /**
   * Whether to validate input with Zod schema
   * @default false in production, true in development
   */
  validate?: boolean;

  /**
   * Whether to extract product IDs from URLs as fallback
   * @default true
   */
  extractProductIds?: boolean;

  /**
   * Whether to include extended metadata fields (brand, category, etc.)
   * @default true
   */
  includeMetadata?: boolean;
}
