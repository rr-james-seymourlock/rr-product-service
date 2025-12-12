/**
 * Types for raw event data from Rakuten apps/extensions
 * These represent the data as it arrives before normalization
 */

/**
 * Raw product view event from apps/extensions
 */
export interface RawProductViewEvent {
  amount: string;
  app_version?: string;
  application_subtype?: string;
  application_type?: string;
  color_list?: string[];
  currency?: string;
  description?: string;
  gtin_list?: string[];
  image_url_list?: string[];
  member_guid?: string;
  model_list?: string[];
  mpn_list?: string[];
  name: string;
  offer_list?: Array<{
    offer_amount: string;
    offer_currency: string;
  }>;
  productid_list?: string[];
  rating?: string[];
  sku_list?: string[];
  store_id: string;
  store_name?: string;
  url: string;
  created_ts?: string;
}

/**
 * Raw cart product item
 */
export interface RawCartProduct {
  image_url?: string;
  item_price: number;
  line_total: number;
  name: string;
  quantity: number;
  url?: string;
}

/**
 * Raw cart event from apps/extensions
 */
export interface RawCartEvent {
  app_version?: string;
  application_subtype?: string;
  application_type?: string;
  cart_total: number;
  cart_total_qty: number;
  currency?: string;
  member_guid?: string;
  page_url?: string;
  product_list: RawCartProduct[];
  store_id: string;
  store_name?: string;
  created_ts?: string;
}

/**
 * Expected match result for fixture validation
 */
export interface ExpectedMatch {
  cartItemName: string;
  productSku: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Fixture structure for cart enrichment test cases
 */
export interface CartEnricherFixture {
  name: string;
  description: string;
  storeId: string;
  storeName: string;
  expectedMatches: ExpectedMatch[];
  productViews: RawProductViewEvent[];
  cartEvents: RawCartEvent[];
}
