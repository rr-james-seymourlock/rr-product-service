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
      expect(result[0]?.skus).toHaveLength(9);
      expect(result[0]?.productIds).toContain('874532012');
      expect(result[0]?.productIds).toContain('874532002'); // productID
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
      expect(result[0]?.skus).toHaveLength(8);
      expect(result[0]?.gtins).toHaveLength(8);
      expect(result[0]?.mpns).toHaveLength(8);
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
      expect(result[0]?.skus).toContain('123456789');
      expect(result[0]?.gtins).toContain('0887276123456');
      expect(result[0]?.mpns).toContain('UN65TU7000');
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
      expect(result[0]?.productIds).toContain('B0D1XD1ZV3');
      expect(result[0]?.skus).toContain('B0D1XD1ZV3');
    });
  });

  describe('product ID consolidation', () => {
    it('should consolidate IDs from sku array', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        sku: ['SKU1', 'SKU2', 'SKU3'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('SKU1');
      expect(result[0]?.productIds).toContain('SKU2');
      expect(result[0]?.productIds).toContain('SKU3');
      expect(result[0]?.skus).toEqual(['SKU1', 'SKU2', 'SKU3']);
    });

    it('should consolidate IDs from sku_list array (App format)', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        sku_list: ['SKU-A', 'SKU-B'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('SKU-A');
      expect(result[0]?.productIds).toContain('SKU-B');
    });

    it('should consolidate IDs from gtin array', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        gtin: ['0123456789012', '0123456789013'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('0123456789012');
      expect(result[0]?.gtins).toContain('0123456789012');
    });

    it('should consolidate IDs from productID array', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        productID: ['PID-001', 'PID-002'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('PID-001');
    });

    it('should consolidate IDs from mpn array', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        mpn: ['MPN-ABC', 'MPN-DEF'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('MPN-ABC');
      expect(result[0]?.mpns).toContain('MPN-ABC');
    });

    it('should extract SKUs from offers (Toolbar format)', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        offers: [{ sku: 'OFFER-SKU-1' }, { sku: 'OFFER-SKU-2' }],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('OFFER-SKU-1');
      expect(result[0]?.productIds).toContain('OFFER-SKU-2');
    });

    it('should extract SKUs from offer_list (App format)', () => {
      const event: RawProductViewEvent = {
        store_id: '1234',
        name: 'Test',
        offer_list: [{ offer_sku: 'APP-SKU-1' }, { offer_sku: 'APP-SKU-2' }],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('APP-SKU-1');
      expect(result[0]?.productIds).toContain('APP-SKU-2');
    });

    it('should extract SKUs from urlToSku map', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        urlToSku: {
          'https://example.com/p1': 'URL-SKU-1',
          'https://example.com/p2': 'URL-SKU-2',
        },
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('URL-SKU-1');
      expect(result[0]?.productIds).toContain('URL-SKU-2');
    });

    it('should extract SKUs from priceToSku map', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        priceToSku: {
          '999': 'PRICE-SKU-1',
          '1999': 'PRICE-SKU-2',
        },
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('PRICE-SKU-1');
      expect(result[0]?.productIds).toContain('PRICE-SKU-2');
    });

    it('should deduplicate IDs across all sources', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        sku: ['DUPE-SKU', 'UNIQUE-1'],
        productID: ['DUPE-SKU', 'UNIQUE-2'],
        offers: [{ sku: 'DUPE-SKU' }],
        urlToSku: { url1: 'DUPE-SKU' },
      };

      const result = normalizeProductViewEvent(event);

      // DUPE-SKU should only appear once in productIds
      const dupeCount = result[0]?.productIds.filter((id) => id === 'DUPE-SKU').length;
      expect(dupeCount).toBe(1);
      expect(result[0]?.productIds).toContain('UNIQUE-1');
      expect(result[0]?.productIds).toContain('UNIQUE-2');
    });

    it('should filter empty and whitespace IDs', () => {
      const result = normalizeProductViewEvent(whitespaceEvent);

      expect(result[0]?.productIds).toContain('VALID-SKU');
      expect(result[0]?.productIds).toContain('VALID-OFFER-SKU');
      expect(result[0]?.productIds).not.toContain('');
      expect(result[0]?.productIds).not.toContain('  ');
    });
  });

  describe('URL-based ID extraction fallback', () => {
    it('should fallback to URL extraction when no schema IDs available', () => {
      const result = normalizeProductViewEvent(noSchemaIdsEvent);

      // URL extraction should kick in as fallback
      expect(result[0]?.productIds).toBeDefined();
      expect(Array.isArray(result[0]?.productIds)).toBe(true);
    });

    it('should not use URL extraction when schema IDs are present', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        url: 'https://example.com/product/URL-ID-123',
        sku: ['SCHEMA-SKU'],
      };

      const result = normalizeProductViewEvent(event);

      expect(result[0]?.productIds).toContain('SCHEMA-SKU');
      // Should not contain the URL-based ID since we have schema IDs
    });

    it('should skip URL extraction when extractProductIds option is false', () => {
      const result = normalizeProductViewEvent(noSchemaIdsEvent, { extractProductIds: false });

      expect(result[0]?.productIds).toEqual([]);
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
      expect(result[0]?.skus).toBeDefined();
    });

    it('should exclude metadata when includeMetadata is false', () => {
      const result = normalizeProductViewEvent(targetToolbarEvent, { includeMetadata: false });

      expect(result[0]?.brand).toBeUndefined();
      expect(result[0]?.rating).toBeUndefined();
      expect(result[0]?.category).toBeUndefined();
      expect(result[0]?.skus).toBeUndefined();
      expect(result[0]?.gtins).toBeUndefined();
      expect(result[0]?.mpns).toBeUndefined();

      // Core fields should still be present
      expect(result[0]?.title).toBe('Womens Short Sleeve Slim Fit Ribbed T-Shirt');
      expect(result[0]?.storeId).toBe('5246');
      expect(result[0]?.productIds).toBeDefined();
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

      expect(Object.isFrozen(result[0]?.productIds)).toBe(true);
    });

    it('should return frozen skus/gtins/mpns arrays', () => {
      const result = normalizeProductViewEvent(hpMultiProductEvent);

      expect(Object.isFrozen(result[0]?.skus)).toBe(true);
      expect(Object.isFrozen(result[0]?.gtins)).toBe(true);
      expect(Object.isFrozen(result[0]?.mpns)).toBe(true);
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
      expect(result[0]?.productIds).toEqual([]);
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
      expect(result[0]?.productIds).toEqual([]);
      expect(result[0]?.skus).toBeUndefined();
    });

    it('should handle event with undefined arrays', () => {
      const event: RawProductViewEvent = {
        store_id: 1234,
        name: 'Test',
        // All arrays undefined
      };

      const result = normalizeProductViewEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.productIds).toEqual([]);
    });
  });
});
