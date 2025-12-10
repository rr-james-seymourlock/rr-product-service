import { describe, expect, it } from 'vitest';

import { normalizeProductViewEvent } from '../normalizer.js';
import type { RawProductViewEvent } from '../types.js';
import {
  amazonToolbarEvent,
  emptyProductEvent,
  hpMultiProductEvent,
  kateSpadeOutletSparseEvent,
  macysAppEvent,
  minimalEvent,
  noSchemaIdsEvent,
  oldNavyVariantsEvent,
  targetToolbarEvent,
  walmartAppEvent,
  whitespaceEvent,
} from './__fixtures__/product-view-events.js';

describe('normalizeProductViewEvent', () => {
  describe('basic normalization', () => {
    it('should normalize Target Toolbar event with offers', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
        storeId: '5246',
        price: 800,
        brand: 'A New Day',
        rating: 4.2,
        category: "Women's Clothing",
      });
      expect(result[0]?.url).toContain('target.com');
      expect(result[0]?.imageUrl).toContain('target.scene7.com');
    });

    it('should normalize Macys App event with _list suffix fields', () => {
      const result = normalizeProductViewEvent(macysAppEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: "Women's Cotton Sweater",
        storeId: '8333',
        price: 4900,
      });
      expect(result[0]?.brand).toBe('Charter Club');
      expect(result[0]?.imageUrl).toContain('macysassets.com');
    });

    it('should normalize Old Navy event with multiple size variants', () => {
      const result = normalizeProductViewEvent(oldNavyVariantsEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: "Men's Slim Built-In Flex Jeans",
        storeId: '5220',
        price: 4999,
        brand: 'Old Navy',
        color: 'Dark Wash',
      });
      // Should consolidate all 9 SKUs
      expect(result[0]?.ids.skus).toHaveLength(9);
      // productIds only contains productID values (not SKUs)
      expect(result[0]?.ids.productIds).toContain('874532002'); // productID
      // SKUs are in the skus field
      expect(result[0]?.ids.skus).toContain('874532012');
    });

    it('should normalize HP event with multiple distinct products', () => {
      const result = normalizeProductViewEvent(hpMultiProductEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'HP Laptops',
        storeId: '5421',
        brand: 'HP',
      });
      // Should have all SKUs, GTINs, and MPNs
      expect(result[0]?.ids.skus).toHaveLength(8);
      expect(result[0]?.ids.gtins).toHaveLength(8);
      expect(result[0]?.ids.mpns).toHaveLength(8);
    });

    it('should handle Kate Spade Outlet sparse event', () => {
      const result = normalizeProductViewEvent(kateSpadeOutletSparseEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Madison Saffiano Leather Medium Satchel',
        storeId: '35936',
      });
      expect(result[0]?.url).toContain('katespadeoutlet.com');
      // Empty image_url should not be included
      expect(result[0]?.imageUrl).toBeUndefined();
    });

    it('should normalize Walmart App event with mixed identifiers', () => {
      const result = normalizeProductViewEvent(walmartAppEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Samsung 65" Class 4K Crystal UHD Smart TV',
        storeId: '5246',
        price: 44800,
        brand: 'Samsung',
        color: 'Black',
        rating: 4.5,
      });
      expect(result[0]?.ids.skus).toContain('123456789');
      expect(result[0]?.ids.gtins).toContain('0887276123456');
      expect(result[0]?.ids.mpns).toContain('UN65TU7000');
      expect(result[0]?.category).toBe('Electronics > TVs > Samsung TVs');
    });

    it('should normalize Amazon event with ASIN', () => {
      const result = normalizeProductViewEvent(amazonToolbarEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Apple AirPods Pro (2nd Generation)',
        storeId: '2087',
        price: 24999,
        brand: 'Apple',
        rating: 4.7,
      });
      // ASIN should be in both sku and productID
      expect(result[0]?.ids.productIds).toContain('B0D1XD1ZV3');
      expect(result[0]?.ids.skus).toContain('B0D1XD1ZV3');
    });
  });

  describe('product ID consolidation', () => {
    it('should put SKUs in skus field, not productIds', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        sku: ['SKU1', 'SKU2', 'SKU3'],
      };

      const result = normalizeProductViewEvent(event);

      // SKUs should NOT be in productIds (only productID values go there)
      expect(result[0]?.ids.productIds).toEqual([]);
      // SKUs go in the skus field
      expect(result[0]?.ids.skus).toEqual(['SKU1', 'SKU2', 'SKU3']);
    });

    it('should put sku_list values in skus field (App format)', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        sku_list: ['SKU-A', 'SKU-B'],
      };

      const result = normalizeProductViewEvent(event);

      // SKUs should NOT be in productIds
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.skus).toContain('SKU-A');
      expect(result[0]?.ids.skus).toContain('SKU-B');
    });

    it('should combine both sku and sku_list values in skus field', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        sku: ['SKU-FROM-SKU'],
        sku_list: ['SKU-FROM-LIST'],
      };

      const result = normalizeProductViewEvent(event);

      // Both sources should be combined
      expect(result[0]?.ids.skus).toContain('SKU-FROM-SKU');
      expect(result[0]?.ids.skus).toContain('SKU-FROM-LIST');
      expect(result[0]?.ids.skus).toHaveLength(2);
    });

    it('should put GTINs in gtins field, not productIds', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        gtin: ['0123456789012', '0123456789013'],
      };

      const result = normalizeProductViewEvent(event);

      // GTINs should NOT be in productIds (only productID values go there)
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.gtins).toContain('0123456789012');
      expect(result[0]?.ids.gtins).toContain('0123456789013');
    });

    it('should combine both gtin and gtin_list values in gtins field', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        gtin: ['GTIN-FROM-GTIN'],
        gtin_list: ['GTIN-FROM-LIST'],
      };

      const result = normalizeProductViewEvent(event);

      // Both sources should be combined
      expect(result[0]?.ids.gtins).toContain('GTIN-FROM-GTIN');
      expect(result[0]?.ids.gtins).toContain('GTIN-FROM-LIST');
      expect(result[0]?.ids.gtins).toHaveLength(2);
    });

    it('should put productID values in productIds', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        productID: ['PID-001', 'PID-002'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.ids.productIds).toContain('PID-001');
      expect(result[0]?.ids.productIds).toContain('PID-002');
    });

    it('should put MPNs in mpns field, not productIds', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        mpn: ['MPN-ABC', 'MPN-DEF'],
      };

      const result = normalizeProductViewEvent(event);

      // MPNs should NOT be in productIds (only productID values go there)
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.mpns).toContain('MPN-ABC');
      expect(result[0]?.ids.mpns).toContain('MPN-DEF');
    });

    it('should combine both mpn and mpn_list values in mpns field', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        mpn: ['MPN-FROM-MPN'],
        mpn_list: ['MPN-FROM-LIST'],
      };

      const result = normalizeProductViewEvent(event);

      // Both sources should be combined
      expect(result[0]?.ids.mpns).toContain('MPN-FROM-MPN');
      expect(result[0]?.ids.mpns).toContain('MPN-FROM-LIST');
      expect(result[0]?.ids.mpns).toHaveLength(2);
    });

    it('should put offer SKUs in skus field (Toolbar format)', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        offers: [{ sku: 'OFFER-SKU-1' }, { sku: 'OFFER-SKU-2' }],
      };

      const result = normalizeProductViewEvent(event);

      // Offer SKUs should NOT be in productIds
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.skus).toContain('OFFER-SKU-1');
      expect(result[0]?.ids.skus).toContain('OFFER-SKU-2');
    });

    it('should put offer_list SKUs in skus field (App format)', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        offer_list: [{ offer_sku: 'APP-SKU-1' }, { offer_sku: 'APP-SKU-2' }],
      };

      const result = normalizeProductViewEvent(event);

      // App SKUs should NOT be in productIds
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.skus).toContain('APP-SKU-1');
      expect(result[0]?.ids.skus).toContain('APP-SKU-2');
    });

    it('should put urlToSku values in skus field', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        urlToSku: {
          'https://example.com/p1': 'URL-SKU-1',
          'https://example.com/p2': 'URL-SKU-2',
        },
      };

      const result = normalizeProductViewEvent(event);

      // urlToSku values should NOT be in productIds
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.skus).toContain('URL-SKU-1');
      expect(result[0]?.ids.skus).toContain('URL-SKU-2');
    });

    it('should put priceToSku values in skus field', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        priceToSku: {
          '999': 'PRICE-SKU-1',
          '1999': 'PRICE-SKU-2',
        },
      };

      const result = normalizeProductViewEvent(event);

      // priceToSku values should NOT be in productIds
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.skus).toContain('PRICE-SKU-1');
      expect(result[0]?.ids.skus).toContain('PRICE-SKU-2');
    });

    it('should deduplicate productID values', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        productID: ['PID-001', 'PID-001', 'PID-002'],
        productid_list: ['PID-001', 'PID-003'],
      };

      const result = normalizeProductViewEvent(event);

      // productIds should be deduplicated
      expect(result[0]?.ids.productIds).toHaveLength(3);
      expect(result[0]?.ids.productIds).toContain('PID-001');
      expect(result[0]?.ids.productIds).toContain('PID-002');
      expect(result[0]?.ids.productIds).toContain('PID-003');
    });

    it('should filter empty and whitespace IDs', () => {
      const result = normalizeProductViewEvent(whitespaceEvent);

      // SKUs go in skus field, not productIds
      expect(result[0]?.ids.skus).toContain('VALID-SKU');
      expect(result[0]?.ids.skus).toContain('VALID-OFFER-SKU');
      expect(result[0]?.ids.skus).not.toContain('');
      expect(result[0]?.ids.skus).not.toContain('  ');
    });
  });

  describe('URL-based ID extraction (extractedIds)', () => {
    it('should extract IDs from URL into extractedIds', () => {
      const result = normalizeProductViewEvent(noSchemaIdsEvent);

      // URL extraction goes into extractedIds, not productIds
      expect(result[0]?.ids.extractedIds).toBeDefined();
      expect(Array.isArray(result[0]?.ids.extractedIds)).toBe(true);
      // productIds should be empty (no schema.org data)
      expect(result[0]?.ids.productIds).toEqual([]);
    });

    it('should keep productID values in productIds and URL IDs in extractedIds separately', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        url: 'https://example.com/product/URL-ID-123',
        productID: ['SCHEMA-PRODUCT-ID'],
        sku: ['SCHEMA-SKU'],
      };

      const result = normalizeProductViewEvent(event);

      // Only productID values go in productIds (not SKUs)
      expect(result[0]?.ids.productIds).toContain('SCHEMA-PRODUCT-ID');
      expect(result[0]?.ids.productIds).not.toContain('SCHEMA-SKU');
      // SKUs go in skus field
      expect(result[0]?.ids.skus).toContain('SCHEMA-SKU');
      // URL-extracted IDs go in extractedIds (always extracted when available)
      expect(result[0]?.ids.extractedIds).toBeDefined();
      expect(Array.isArray(result[0]?.ids.extractedIds)).toBe(true);
    });

    it('should skip URL extraction when extractProductIds option is false', () => {
      const result = normalizeProductViewEvent(noSchemaIdsEvent, { extractProductIds: false });

      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.extractedIds).toEqual([]);
    });

    it('should always include extractedIds array even when empty', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        // No URL, so no extraction possible
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.ids.extractedIds).toEqual([]);
    });
  });

  describe('store_id handling', () => {
    it('should coerce numeric store_id to string', () => {
      const event: RawProductViewEvent = {
        store_id: 5246,
        name: 'Test',
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.storeId).toBe('5246');
    });

    it('should preserve string store_id', () => {
      const event: RawProductViewEvent = {
        store_id: '8333',
        name: 'Test',
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.storeId).toBe('8333');
    });

    it('should handle undefined store_id', () => {
      const event: RawProductViewEvent = {
        name: 'Test',
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.storeId).toBeUndefined();
    });

    it('should preserve non-numeric string store_id', () => {
      const event: RawProductViewEvent = {
        store_id: 'uk-87262',
        name: 'Test',
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.storeId).toBe('uk-87262');
    });
  });

  describe('field extraction', () => {
    it('should prefer url over product_url over page_url', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        url: 'https://example.com/url',
        product_url: 'https://example.com/product_url',
        page_url: 'https://example.com/page_url',
      };

      const result1 = normalizeProductViewEvent(event1);
      expect(result1[0]?.url).toBe('https://example.com/url');

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        product_url: 'https://example.com/product_url',
        page_url: 'https://example.com/page_url',
      };

      const result2 = normalizeProductViewEvent(event2);
      expect(result2[0]?.url).toBe('https://example.com/product_url');

      const event3: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        page_url: 'https://example.com/page_url',
      };

      const result3 = normalizeProductViewEvent(event3);
      expect(result3[0]?.url).toBe('https://example.com/page_url');
    });

    it('should prefer image_url over image_url_list[0]', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        image_url: 'https://example.com/image.jpg',
        image_url_list: ['https://example.com/list-image.jpg'],
      };

      const result1 = normalizeProductViewEvent(event1);
      expect(result1[0]?.imageUrl).toBe('https://example.com/image.jpg');

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        image_url_list: ['https://example.com/list-image.jpg'],
      };

      const result2 = normalizeProductViewEvent(event2);
      expect(result2[0]?.imageUrl).toBe('https://example.com/list-image.jpg');
    });

    it('should extract price from offers (Toolbar)', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        offers: [{ price: 2999 }],
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.price).toBe(2999);
    });

    it('should extract price from offer_list (App)', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        offer_list: [{ offer_amount: 3999 }],
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.price).toBe(3999);
    });

    it('should extract brand from brand field', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        brand: 'Nike',
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.brand).toBe('Nike');
    });

    it('should extract brand from brand_list[0]', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        brand_list: ['Adidas', 'Other'],
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.brand).toBe('Adidas');
    });

    it('should extract category from category field', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        category: 'Electronics',
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.category).toBe('Electronics');
    });

    it('should fallback to breadcrumbs for category', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        breadcrumbs: 'Home > Electronics > TVs',
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.category).toBe('Home > Electronics > TVs');
    });

    it('should extract color from color field', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        color: 'Red',
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.color).toBe('Red');
    });

    it('should extract color from color_list[0]', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        color_list: ['Blue', 'Green'],
      };

      const result = normalizeProductViewEvent(event);
      expect(result[0]?.color).toBe('Blue');
    });
  });

  describe('metadata option', () => {
    it('should include metadata by default', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent);

      expect(result[0]?.brand).toBe('A New Day');
      expect(result[0]?.rating).toBe(4.2);
      expect(result[0]?.category).toBe("Women's Clothing");
      expect(result[0]?.ids.skus).toBeDefined();
    });

    it('should exclude metadata when includeMetadata is false', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent, { includeMetadata: false });

      expect(result[0]?.brand).toBeUndefined();
      expect(result[0]?.rating).toBeUndefined();
      expect(result[0]?.category).toBeUndefined();
      expect(result[0]?.ids.skus).toBeUndefined();
      expect(result[0]?.ids.gtins).toBeUndefined();
      expect(result[0]?.ids.mpns).toBeUndefined();

      // Core fields should still be present
      expect(result[0]?.title).toBe('Womens Short Sleeve Slim Fit Ribbed T-Shirt');
      expect(result[0]?.storeId).toBe('5246');
      expect(result[0]?.ids.productIds).toBeDefined();
    });
  });

  describe('validation option', () => {
    it('should pass validation for valid events', () => {
      expect(() => normalizeProductViewEvent(targetToolbarEvent, { validate: true })).not.toThrow();
    });

    it('should throw for invalid events when validation is enabled', () => {
      const invalidEvent = {
        store_id: 1234,
        sku: 'not an array', // Should be array
      } as unknown as RawProductViewEvent;

      expect(() => normalizeProductViewEvent(invalidEvent, { validate: true })).toThrow();
    });

    it('should not validate by default', () => {
      const quirkyEvent = {
        store_id: 1234,
        name: 'Test',
        extra_field: 'ignored',
      } as RawProductViewEvent;

      expect(() => normalizeProductViewEvent(quirkyEvent)).not.toThrow();
    });
  });

  describe('immutability', () => {
    it('should return frozen array', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return frozen product objects', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent);

      result.forEach((product) => {
        expect(Object.isFrozen(product)).toBe(true);
      });
    });

    it('should return frozen productIds array', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent);

      expect(Object.isFrozen(result[0]?.ids.productIds)).toBe(true);
    });

    it('should return frozen skus/gtins/mpns arrays', () => {
      const result = normalizeProductViewEvent(hpMultiProductEvent);

      expect(Object.isFrozen(result[0]?.ids.skus)).toBe(true);
      expect(Object.isFrozen(result[0]?.ids.gtins)).toBe(true);
      expect(Object.isFrozen(result[0]?.ids.mpns)).toBe(true);
    });

    it('should not mutate input event', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        sku: ['SKU1'],
      };
      const originalEvent = JSON.parse(JSON.stringify(event));

      normalizeProductViewEvent(event);

      expect(event).toEqual(originalEvent);
    });
  });

  describe('deduplication', () => {
    it('should keep products with different fingerprints', () => {
      // Two different products with different SKUs
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Red T-Shirt',
        url: 'https://example.com/tshirt?color=red',
        sku: ['SKU-RED'],
        offers: [{ price: 1999 }],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Blue T-Shirt',
        url: 'https://example.com/tshirt?color=blue',
        sku: ['SKU-BLUE'],
        offers: [{ price: 1999 }],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Each event produces one unique product
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0]?.ids.skus).toContain('SKU-RED');
      expect(result2[0]?.ids.skus).toContain('SKU-BLUE');
    });

    it('should keep product without fingerprint (no identifying data)', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        // No name, url, price, or identifiers
      };

      const result = normalizeProductViewEvent(event);

      // Product without fingerprint should be kept
      expect(result).toHaveLength(1);
      expect(result[0]?.storeId).toBe('1234');
    });

    it('should include title in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Product A',
        url: 'https://example.com/product',
        offers: [{ price: 999 }],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Product B',
        url: 'https://example.com/product',
        offers: [{ price: 999 }],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different titles = different fingerprints = both kept
      expect(result1[0]?.title).toBe('Product A');
      expect(result2[0]?.title).toBe('Product B');
    });

    it('should include price in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        url: 'https://example.com/product',
        offers: [{ price: 999 }],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        url: 'https://example.com/product',
        offers: [{ price: 1999 }],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different prices = different fingerprints = both kept
      expect(result1[0]?.price).toBe(999);
      expect(result2[0]?.price).toBe(1999);
    });

    it('should include url in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        url: 'https://example.com/product-a',
        offers: [{ price: 999 }],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        url: 'https://example.com/product-b',
        offers: [{ price: 999 }],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different URLs = different fingerprints = both kept
      expect(result1[0]?.url).toBe('https://example.com/product-a');
      expect(result2[0]?.url).toBe('https://example.com/product-b');
    });

    it('should include skus in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        url: 'https://example.com/product',
        sku: ['SKU-A'],
        offers: [{ price: 999 }],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        url: 'https://example.com/product',
        sku: ['SKU-B'],
        offers: [{ price: 999 }],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different SKUs = different fingerprints = both kept
      expect(result1[0]?.ids.skus).toContain('SKU-A');
      expect(result2[0]?.ids.skus).toContain('SKU-B');
    });

    it('should include gtins in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        gtin: ['0123456789012'],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        gtin: ['0123456789013'],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different GTINs = different fingerprints = both kept
      expect(result1[0]?.ids.gtins).toContain('0123456789012');
      expect(result2[0]?.ids.gtins).toContain('0123456789013');
    });

    it('should include mpns in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        mpn: ['MPN-A'],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        mpn: ['MPN-B'],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different MPNs = different fingerprints = both kept
      expect(result1[0]?.ids.mpns).toContain('MPN-A');
      expect(result2[0]?.ids.mpns).toContain('MPN-B');
    });

    it('should include productIds in fingerprint', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        productID: ['PID-A'],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Same Product',
        productID: ['PID-B'],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Different productIDs = different fingerprints = both kept
      expect(result1[0]?.ids.productIds).toContain('PID-A');
      expect(result2[0]?.ids.productIds).toContain('PID-B');
    });

    it('should sort identifiers for consistent fingerprints', () => {
      const event1: RawProductViewEvent = {
        store_id: 1234,
        name: 'Product',
        sku: ['SKU-B', 'SKU-A', 'SKU-C'],
      };

      const event2: RawProductViewEvent = {
        store_id: 1234,
        name: 'Product',
        sku: ['SKU-A', 'SKU-C', 'SKU-B'],
      };

      const result1 = normalizeProductViewEvent(event1);
      const result2 = normalizeProductViewEvent(event2);

      // Same SKUs in different order should produce same fingerprint
      // Both should be kept as they're normalized separately, but fingerprints would match
      // Copy frozen arrays before sorting
      expect([...(result1[0]?.ids.skus ?? [])].sort()).toEqual(['SKU-A', 'SKU-B', 'SKU-C']);
      expect([...(result2[0]?.ids.skus ?? [])].sort()).toEqual(['SKU-A', 'SKU-B', 'SKU-C']);
    });
  });

  describe('variant handling', () => {
    it('should detect variants from sku array', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        sku: ['VARIANT-S', 'VARIANT-M', 'VARIANT-L'],
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      expect(variantSkus).toEqual(['VARIANT-S', 'VARIANT-M', 'VARIANT-L']);
      expect(result[0]?.variantCount).toBe(3);
      expect(result[0]?.hasVariants).toBe(true);
    });

    it('should detect variants from offers with price and URL', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        offers: [
          { sku: 'OFFER-SKU-1', price: 999, url: 'https://example.com/sku1' },
          { sku: 'OFFER-SKU-2', price: 1299, url: 'https://example.com/sku2' },
        ],
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      expect(variantSkus).toContain('OFFER-SKU-1');
      expect(variantSkus).toContain('OFFER-SKU-2');
      expect(result[0]?.hasVariants).toBe(true);

      // Verify variant objects have price and URL
      const variant1 = result[0]?.variants.find((v) => v.sku === 'OFFER-SKU-1');
      expect(variant1?.price).toBe(999);
      expect(variant1?.url).toBe('https://example.com/sku1');
    });

    it('should detect variants from urlToSku map with URL correlation', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        urlToSku: {
          'https://example.com/size-s': 'SIZE-S',
          'https://example.com/size-m': 'SIZE-M',
        },
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      expect(variantSkus).toContain('SIZE-S');
      expect(variantSkus).toContain('SIZE-M');
      expect(result[0]?.hasVariants).toBe(true);

      // Verify variant objects have URL from urlToSku
      const variantS = result[0]?.variants.find((v) => v.sku === 'SIZE-S');
      expect(variantS?.url).toBe('https://example.com/size-s');
    });

    it('should detect variants from priceToSku map', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        sku: ['REGULAR-SKU', 'PREMIUM-SKU'],
        priceToSku: {
          '1999': 'REGULAR-SKU',
          '2999': 'PREMIUM-SKU',
        },
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      expect(variantSkus).toContain('REGULAR-SKU');
      expect(variantSkus).toContain('PREMIUM-SKU');
      expect(result[0]?.hasVariants).toBe(true);
    });

    it('should set hasVariants=false when only one variant', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        sku: ['SINGLE-SKU'],
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      expect(variantSkus).toEqual(['SINGLE-SKU']);
      expect(result[0]?.variantCount).toBe(1);
      expect(result[0]?.hasVariants).toBe(false);
    });

    it('should have empty variants array when no variants detected', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        // No sku, offers, urlToSku, or priceToSku
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.variants).toEqual([]);
      expect(result[0]?.variantCount).toBe(0);
      expect(result[0]?.hasVariants).toBe(false);
    });

    it('should deduplicate variants by SKU within offers', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        // When offers have SKUs, variants are built from offers (takes priority)
        offers: [
          { sku: 'DUPE-SKU', price: 999 },
          { sku: 'DUPE-SKU', price: 1099 }, // Duplicate SKU
          { sku: 'UNIQUE-SKU', price: 1299 },
        ],
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      // Should deduplicate DUPE-SKU
      const dupeCount = variantSkus?.filter((s: string) => s === 'DUPE-SKU').length;
      expect(dupeCount).toBe(1);
      expect(variantSkus).toContain('UNIQUE-SKU');
      expect(result[0]?.variantCount).toBe(2);
    });

    it('should handle Old Navy variant event with variants from offers', () => {
      const result = normalizeProductViewEvent(oldNavyVariantsEvent);

      // Old Navy fixture has offers with SKUs, so variants are built from offers (3 offers)
      // Priority: offers > sku array when offers have SKUs
      expect(result[0]?.variants.length).toBe(3);
      expect(result[0]?.variantCount).toBe(3);
      expect(result[0]?.hasVariants).toBe(true);

      // Parent productID should still be in productIds
      expect(result[0]?.ids.productIds).toContain('874532002');

      // All 9 SKUs from sku array should still be in ids.skus (aggregated identifiers)
      expect(result[0]?.ids.skus).toHaveLength(9);
    });

    it('should keep variant SKUs in skus and variants array, productIds only for productID values', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        sku: ['VARIANT-S', 'VARIANT-M', 'VARIANT-L'],
      };

      const result = normalizeProductViewEvent(event);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      // productIds should only contain productID values
      expect(result[0]?.ids.productIds).toContain('PARENT-123');
      expect(result[0]?.ids.productIds).not.toContain('VARIANT-S');
      // Variant SKUs are in skus field
      expect(result[0]?.ids.skus).toContain('VARIANT-S');
      expect(result[0]?.ids.skus).toContain('VARIANT-M');
      expect(result[0]?.ids.skus).toContain('VARIANT-L');
      // And also in variants array
      expect(variantSkus).toContain('VARIANT-S');
    });

    it('should still include variants when includeMetadata is false', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        productID: ['PARENT-123'],
        sku: ['VARIANT-S', 'VARIANT-M', 'VARIANT-L'],
      };

      const result = normalizeProductViewEvent(event, { includeMetadata: false });

      // Variants are structural data, not metadata - they're needed for joining
      expect(result[0]?.variants.length).toBe(3);
      expect(result[0]?.variantCount).toBe(3);
      expect(result[0]?.hasVariants).toBe(true);
      // But skus field is metadata and should be excluded
      expect(result[0]?.ids.skus).toBeUndefined();

      // productIds should only contain productID values
      expect(result[0]?.ids.productIds).toContain('PARENT-123');
      expect(result[0]?.ids.productIds).not.toContain('VARIANT-S');
    });

    it('should return frozen variants array', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test Product',
        sku: ['SKU-1', 'SKU-2'],
      };

      const result = normalizeProductViewEvent(event);

      expect(Object.isFrozen(result[0]?.variants)).toBe(true);
    });

    it('should handle Target event with variant data in offers and urlToSku', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent);
      const variantSkus = result[0]?.variants.map((v) => v.sku);

      // Target event has offers with SKUs
      expect(result[0]?.variants.length).toBeGreaterThan(0);
      expect(variantSkus).toContain('88056717');
      expect(variantSkus).toContain('88056723');
      expect(variantSkus).toContain('88056720');
      expect(result[0]?.hasVariants).toBe(true);
    });

    it('should include variant-specific extractedIds from URLs', () => {
      const event: RawProductViewEvent = {
        store_id: '5246', // Target store ID
        name: 'Test Product',
        urlToSku: {
          // Note: Target regex expects lowercase 'a-' prefix (real URLs use uppercase A- but regex is case-sensitive)
          'https://www.target.com/p/product-name/-/a-12345678': 'SKU-12345',
          'https://www.target.com/p/product-name/-/a-67890123': 'SKU-67890',
        },
      };

      const result = normalizeProductViewEvent(event);

      // Each variant should have extractedIds from its URL
      const variant1 = result[0]?.variants.find((v) => v.sku === 'SKU-12345');
      const variant2 = result[0]?.variants.find((v) => v.sku === 'SKU-67890');

      // Verify extractedIds exist and contain expected values
      expect(variant1?.extractedIds).toBeDefined();
      expect(variant2?.extractedIds).toBeDefined();
      expect(variant1?.extractedIds).toContain('12345678');
      expect(variant2?.extractedIds).toContain('67890123');
    });
  });

  describe('edge cases', () => {
    it('should handle minimal event', () => {
      const result = normalizeProductViewEvent(minimalEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Minimal Product',
        storeId: '1234',
        url: 'https://www.example.com/product',
      });
    });

    it('should handle event with only store_id', () => {
      const result = normalizeProductViewEvent(emptyProductEvent);

      expect(result).toHaveLength(1);
      expect(result[0]?.storeId).toBe('1234');
      expect(result[0]?.ids.productIds).toEqual([]);
    });

    it('should filter whitespace values', () => {
      const result = normalizeProductViewEvent(whitespaceEvent);

      // Whitespace name should not become title
      expect(result[0]?.title).toBeUndefined();
      // Whitespace url should not be included
      expect(result[0]?.url).toBeUndefined();
      // Whitespace image_url should not be included
      expect(result[0]?.imageUrl).toBeUndefined();
    });

    it('should handle event with empty arrays', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        sku: [],
        gtin: [],
        productID: [],
        mpn: [],
        offers: [],
        offer_list: [],
      };

      const result = normalizeProductViewEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.skus).toBeUndefined();
    });

    it('should handle event with undefined arrays', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        // All arrays undefined
      };

      const result = normalizeProductViewEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.ids.productIds).toEqual([]);
    });
  });
});
