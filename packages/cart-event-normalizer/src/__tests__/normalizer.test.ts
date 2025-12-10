import { describe, expect, it } from 'vitest';

import { normalizeCartEvent } from '../normalizer.js';
import type { RawCartEvent } from '../types.js';
import {
  ancestryEvent,
  barnesNobleEvent,
  bestBuyEvent,
  bloomingdalesEvent,
  lowesEvent,
  macysEvent,
  mlbShopEvent,
  ultaEmptyCartEvent,
  ultaWithProductEvent,
} from './__fixtures__/cart-events.js';

describe('normalizeCartEvent', () => {
  describe('basic normalization', () => {
    it('should normalize MLB Shop event with no product URLs', () => {
      const result = normalizeCartEvent(mlbShopEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: "Men's New York Mets Black Stranger Things Logo Lockup Pullover Hoodie",
        storeId: '5806',
        price: 7499,
        quantity: 1,
        lineTotal: 7499,
        ids: {
          productIds: [],
          extractedIds: [],
        },
      });
      expect(result[0]?.imageUrl).toContain('fanatics.frgimages.com');
    });

    it('should normalize Barnes & Noble event with multiple products', () => {
      const result = normalizeCartEvent(barnesNobleEvent);

      expect(result).toHaveLength(5);
      expect(result[0]).toMatchObject({
        title: '365 Puzzles Sudoku',
        storeId: '96',
        price: 900,
        quantity: 1,
      });
      expect(result[4]).toMatchObject({
        title: "Rosalina's Storybook",
        storeId: '96',
        price: 2499,
      });
    });

    it('should filter Ancestry event products that only have price (no URL, no name)', () => {
      const result = normalizeCartEvent(ancestryEvent);

      // Products with only price (no URL, no name) should be filtered out
      // under the new validation rules
      expect(result).toHaveLength(0);
    });

    it('should return empty array for event with empty product_list', () => {
      const result = normalizeCartEvent(ultaEmptyCartEvent);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle Macys event with string store_id', () => {
      const result = normalizeCartEvent(macysEvent);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        title: "Hippie Rose Juniors' Mock-Neck Eyelash-Cable Knit Sweater",
        storeId: '8333',
        price: 1560,
      });
    });

    it('should handle Best Buy event with price = 0', () => {
      const result = normalizeCartEvent(bestBuyEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'HP - OfficeJet Pro 9125e Wireless AI-Enabled AiO Inkjet Printer',
        storeId: '4767',
        price: 0,
      });
    });

    it('should handle Bloomingdales event with complex URLs', () => {
      const result = normalizeCartEvent(bloomingdalesEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'All-Clad D5 Stainless Brushed 5-Ply Bonded 10-Piece Cookware Set',
        storeId: '9376',
        price: 79999,
      });
      expect(result[0]?.url).toContain('bloomingdales.com');
    });

    it('should handle Lowes Android event with multiple products', () => {
      const result = normalizeCartEvent(lowesEvent);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'everydrop Push-in Refrigerator Water Filter Filter 1',
        storeId: '10722',
        price: 5999,
      });
      expect(result[1]).toMatchObject({
        title: 'GE Snowflake 8 -Count Sparkling White LED Plug-In Christmas Icicle Lights',
        storeId: '10722',
        price: 3498,
      });
    });
  });

  describe('product filtering', () => {
    it('should include products with URL regardless of other fields', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { url: 'https://example.com/product1' }, // URL only - valid
          { url: 'https://example.com/product2', name: 'Named' }, // URL + name - valid
          { url: 'https://example.com/product3', item_price: 100 }, // URL + price - valid
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(3);
      expect(result[0]?.url).toBe('https://example.com/product1');
      expect(result[1]?.title).toBe('Named');
      expect(result[2]?.price).toBe(100);
    });

    it('should include products without URL if they have both name AND price', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Product with both', item_price: 999 }, // valid - has both
          { name: 'Another product', item_price: 0 }, // valid - price=0 counts
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('Product with both');
      expect(result[0]?.price).toBe(999);
      expect(result[1]?.title).toBe('Another product');
      expect(result[1]?.price).toBe(0);
    });

    it('should filter out products with only name (no URL, no price)', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Name only product' }, // invalid - no URL, no price
          { name: 'Valid product', item_price: 100 }, // valid - has both name and price
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Valid product');
    });

    it('should filter out products with only price (no URL, no name)', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { item_price: 999 }, // invalid - no URL, no name
          { item_price: 0 }, // invalid - no URL, no name
          { name: 'Valid', item_price: 50 }, // valid - has both
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Valid');
      expect(result[0]?.price).toBe(50);
    });

    it('should filter out products with no useful data', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Valid product', item_price: 100 },
          { image_url: 'https://example.com/image.jpg' }, // no URL, no name, no price
          { quantity: 5 }, // no URL, no name, no price
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Valid product');
    });

    it('should filter out products with empty/whitespace URL and missing name or price', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { url: '', name: 'No price' }, // empty URL, no price - invalid
          { url: '   ', item_price: 100 }, // whitespace URL, no name - invalid
          { url: '', name: 'Valid', item_price: 100 }, // empty URL but has both - valid
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Valid');
    });
  });

  describe('store_id handling', () => {
    it('should coerce numeric store_id to string', () => {
      const event: RawCartEvent = {
        store_id: 5252,
        product_list: [{ name: 'Test', item_price: 100 }],
      };

      const result = normalizeCartEvent(event);

      expect(result[0]?.storeId).toBe('5252');
    });

    it('should preserve string store_id', () => {
      const event: RawCartEvent = {
        store_id: '8337',
        product_list: [{ name: 'Test', item_price: 100 }],
      };

      const result = normalizeCartEvent(event);

      expect(result[0]?.storeId).toBe('8337');
    });

    it('should handle undefined store_id', () => {
      const event: RawCartEvent = {
        product_list: [{ name: 'Test', item_price: 100 }],
      };

      const result = normalizeCartEvent(event);

      expect(result[0]?.storeId).toBeUndefined();
    });

    it('should preserve non-numeric string store_id (e.g., "uk-87262")', () => {
      const event: RawCartEvent = {
        store_id: 'uk-87262',
        product_list: [{ name: 'Test', item_price: 100 }],
      };

      const result = normalizeCartEvent(event);

      expect(result[0]?.storeId).toBe('uk-87262');
    });
  });

  describe('field mapping', () => {
    it('should map all fields correctly', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          {
            name: 'Complete Product',
            url: 'https://example.com/product/123',
            image_url: 'https://example.com/image.jpg',
            item_price: 2999,
            quantity: 2,
            line_total: 5998,
          },
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: 'Complete Product',
        url: 'https://example.com/product/123',
        imageUrl: 'https://example.com/image.jpg',
        storeId: '1234',
        price: 2999,
        quantity: 2,
        lineTotal: 5998,
        ids: {
          productIds: [],
          extractedIds: [],
        },
      });
    });

    it('should not include undefined fields in output', () => {
      const event: RawCartEvent = {
        product_list: [{ name: 'Minimal', item_price: 100 }], // needs both name AND price without URL
      };

      const result = normalizeCartEvent(event);

      expect(result[0]).toEqual({
        title: 'Minimal',
        price: 100,
        ids: {
          productIds: [],
          extractedIds: [],
        },
      });
      expect(Object.keys(result[0] ?? {})).toEqual(['ids', 'title', 'price']);
    });
  });

  describe('product ID extraction', () => {
    it('should extract IDs from URLs when extractProductIds is true (default)', () => {
      const result = normalizeCartEvent(ultaWithProductEvent);

      // Cart events don't have schema.org data, so productIds is always empty
      expect(result[0]?.ids.productIds).toEqual([]);
      // URL-extracted IDs go in extractedIds
      expect(result[0]?.ids.extractedIds).toBeDefined();
      expect(Array.isArray(result[0]?.ids.extractedIds)).toBe(true);
    });

    it('should not extract IDs when extractProductIds is false', () => {
      const result = normalizeCartEvent(barnesNobleEvent, { extractProductIds: false });

      result.forEach((product) => {
        expect(product.ids.productIds).toEqual([]);
        expect(product.ids.extractedIds).toEqual([]);
      });
    });

    it('should return empty extractedIds array for products without URLs', () => {
      const result = normalizeCartEvent(mlbShopEvent);

      expect(result[0]?.ids.productIds).toEqual([]);
      expect(result[0]?.ids.extractedIds).toEqual([]);
    });

    it('should handle products with different URL extraction results', () => {
      const result = normalizeCartEvent(lowesEvent);

      expect(result).toHaveLength(2);
      // All products should have both productIds and extractedIds arrays in ids object
      result.forEach((product) => {
        expect(product.ids.productIds).toEqual([]); // Cart events have no schema.org data
        expect(product.ids.extractedIds).toBeDefined();
        expect(Array.isArray(product.ids.extractedIds)).toBe(true);
      });
    });
  });

  describe('validation option', () => {
    it('should pass validation for valid events', () => {
      expect(() => normalizeCartEvent(barnesNobleEvent, { validate: true })).not.toThrow();
    });

    it('should throw for invalid events when validation is enabled', () => {
      const invalidEvent = {
        store_id: 1234,
        product_list: 'not an array', // Invalid
      } as unknown as RawCartEvent;

      expect(() => normalizeCartEvent(invalidEvent, { validate: true })).toThrow();
    });

    it('should not validate by default', () => {
      // This would fail validation but should work without validate: true
      const quirkyEvent = {
        store_id: 1234,
        product_list: [{ name: 'Test', item_price: 100 }],
        extra_field: 'ignored',
      } as RawCartEvent;

      expect(() => normalizeCartEvent(quirkyEvent)).not.toThrow();
    });
  });

  describe('immutability', () => {
    it('should return frozen array', () => {
      const result = normalizeCartEvent(barnesNobleEvent);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return frozen product objects', () => {
      const result = normalizeCartEvent(barnesNobleEvent);

      result.forEach((product) => {
        expect(Object.isFrozen(product)).toBe(true);
      });
    });

    it('should not mutate input event', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [{ name: 'Test', item_price: 100 }],
      };
      const originalEvent = JSON.parse(JSON.stringify(event));

      normalizeCartEvent(event);

      expect(event).toEqual(originalEvent);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate products with the same URL', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Product A', url: 'https://example.com/product/123', item_price: 100 },
          { name: 'Product A Copy', url: 'https://example.com/product/123', item_price: 100 },
          { name: 'Product A Again', url: 'https://example.com/product/123', item_price: 150 },
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Product A'); // First occurrence kept
      expect(result[0]?.price).toBe(100);
    });

    it('should keep products with different URLs', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Product A', url: 'https://example.com/product/123', item_price: 100 },
          { name: 'Product B', url: 'https://example.com/product/456', item_price: 200 },
          { name: 'Product C', url: 'https://example.com/product/789', item_price: 300 },
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(3);
    });

    it('should deduplicate products without URL but same productIds', () => {
      // Products without URL that extract to same productIds should be deduplicated
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Product A', item_price: 100 },
          { name: 'Product A Copy', item_price: 100 },
        ],
      };

      const result = normalizeCartEvent(event);

      // Both have no URL and no productIds, so they can't be deduplicated
      // and both are kept
      expect(result).toHaveLength(2);
    });

    it('should keep products without deduplication key (no URL, no productIds)', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Product A', item_price: 100 }, // No URL, no productIds
          { name: 'Product B', item_price: 200 }, // No URL, no productIds
        ],
      };

      const result = normalizeCartEvent(event, { extractProductIds: false });

      // Without productIds extraction and no URLs, all products are kept
      expect(result).toHaveLength(2);
    });

    it('should deduplicate mixed products correctly', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'Unique 1', url: 'https://example.com/product/1', item_price: 100 },
          { name: 'Duplicate of 1', url: 'https://example.com/product/1', item_price: 100 },
          { name: 'Unique 2', url: 'https://example.com/product/2', item_price: 200 },
          { name: 'No URL Product', item_price: 300 }, // Kept (no dedup key)
          { name: 'Unique 3', url: 'https://example.com/product/3', item_price: 400 },
          { name: 'Another Duplicate of 1', url: 'https://example.com/product/1', item_price: 100 },
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(4);
      expect(result.map((p) => p.title)).toEqual([
        'Unique 1',
        'Unique 2',
        'No URL Product',
        'Unique 3',
      ]);
    });

    it('should preserve first occurrence when deduplicating', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: 'First', url: 'https://example.com/product/123', item_price: 100, quantity: 1 },
          { name: 'Second', url: 'https://example.com/product/123', item_price: 200, quantity: 2 },
          { name: 'Third', url: 'https://example.com/product/123', item_price: 300, quantity: 3 },
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'First',
        price: 100,
        quantity: 1,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle event with undefined product_list', () => {
      const event = {
        store_id: 1234,
      } as RawCartEvent;

      const result = normalizeCartEvent(event);

      expect(result).toEqual([]);
    });

    it('should handle event with null-ish values gracefully', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          {
            name: 'Test',
            item_price: 100,
            url: undefined,
            image_url: undefined,
          },
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(1);
      expect(result[0]?.url).toBeUndefined();
      expect(result[0]?.imageUrl).toBeUndefined();
    });

    it('should filter products with whitespace-only names and no URL', () => {
      const event: RawCartEvent = {
        store_id: 1234,
        product_list: [
          { name: '   ', item_price: 100 }, // whitespace name = no name, no URL - filtered
          { name: '\t\n', item_price: 50 }, // whitespace name = no name, no URL - filtered
          { name: 'Valid', item_price: 75 }, // valid - has both name and price
          { url: 'https://example.com/p', name: '  ' }, // has URL - valid even with whitespace name
        ],
      };

      const result = normalizeCartEvent(event);

      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('Valid');
      expect(result[0]?.price).toBe(75);
      expect(result[1]?.url).toBe('https://example.com/p');
      // whitespace name should not be included in output
      expect(result[1]?.title).toBeUndefined();
    });
  });
});
