import { describe, expect, it } from 'vitest';

import type { CartProduct } from '@rr/cart-event-normalizer/types';
import type { NormalizedProduct } from '@rr/product-event-normalizer/types';

import { enrichCart } from '../enricher.js';
import type { EnrichedCartItem } from '../types.js';

// ============================================================
// Test Helper
// ============================================================

/**
 * Helper to get an item from the result with type safety
 * Throws if item doesn't exist (test should fail anyway)
 */
function getItem(items: readonly EnrichedCartItem[], index: number): EnrichedCartItem {
  const item = items[index];
  if (!item) {
    throw new Error(`Expected item at index ${index} but items array has length ${items.length}`);
  }
  return item;
}

// ============================================================
// Test Fixtures
// ============================================================

function createCartItem(overrides: Partial<CartProduct> = {}): CartProduct {
  return {
    title: 'Test Product',
    url: 'https://store.com/product/123',
    imageUrl: 'https://store.com/image.jpg',
    storeId: '5246',
    price: 1999,
    quantity: 2,
    lineTotal: 3998,
    ids: {
      productIds: [],
      extractedIds: ['123'],
      skus: [],
    },
    ...overrides,
  };
}

function createProduct(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    title: 'Test Product',
    url: 'https://store.com/product/123',
    imageUrl: 'https://store.com/image.jpg',
    storeId: '5246',
    brand: 'Test Brand',
    description: 'Test product description',
    category: 'Electronics',
    rating: 4.5,
    price: 1999,
    currency: 'USD',
    ids: {
      productIds: ['prod-123'],
      extractedIds: ['123'],
      skus: ['SKU-123'],
    },
    variants: [
      {
        sku: 'SKU-123',
        url: 'https://store.com/product/123?color=red',
        price: 1999,
        currency: 'USD',
        color: 'Red',
      },
    ],
    variantCount: 1,
    hasVariants: true,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe('enrichCart', () => {
  describe('basic functionality', () => {
    it('returns an enriched cart with summary stats', () => {
      const cartItems: CartProduct[] = [createCartItem()];
      const products: NormalizedProduct[] = [createProduct()];

      const result = enrichCart(cartItems, products);

      expect(result).toBeDefined();
      expect(result.storeId).toBe('5246');
      expect(result.items).toHaveLength(1);
      expect(result.summary).toBeDefined();
      expect(result.enrichedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('preserves cart items without matches', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Unmatched Product',
          url: 'https://store.com/product/999',
          ids: { productIds: [], extractedIds: ['999'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Different Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(result.items).toHaveLength(1);
      const item = getItem(result.items, 0);
      expect(item.wasViewed).toBe(false);
      expect(item.inCart).toBe(true);
      expect(item.matchConfidence).toBe('none');
      expect(item.matchMethod).toBeNull();
    });

    it('handles empty cart items', () => {
      const result = enrichCart([], []);

      expect(result.items).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.matchRate).toBe(0);
    });

    it('returns frozen (immutable) output', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.items)).toBe(true);
      expect(Object.isFrozen(getItem(result.items, 0))).toBe(true);
      expect(Object.isFrozen(getItem(result.items, 0).ids)).toBe(true);
      expect(Object.isFrozen(result.summary)).toBe(true);
    });
  });

  describe('store ID validation', () => {
    it('throws error when store IDs mismatch', () => {
      const cartItems: CartProduct[] = [createCartItem({ storeId: '5246' })];
      const products: NormalizedProduct[] = [createProduct({ storeId: '9999' })];

      expect(() => enrichCart(cartItems, products)).toThrow('Store ID mismatch');
    });

    it('allows matching when only cart has storeId', () => {
      const cartItems: CartProduct[] = [createCartItem({ storeId: '5246' })];
      const products: NormalizedProduct[] = [createProduct({ storeId: undefined })];

      const result = enrichCart(cartItems, products);
      expect(result.storeId).toBe('5246');
    });

    it('allows matching when only products have storeId', () => {
      const cartItems: CartProduct[] = [createCartItem({ storeId: undefined })];
      const products: NormalizedProduct[] = [createProduct({ storeId: '5246' })];

      const result = enrichCart(cartItems, products);
      expect(result.storeId).toBe('5246');
    });
  });

  describe('SKU matching (high confidence)', () => {
    it('matches by exact SKU', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['SKU-123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['SKU-123'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).wasViewed).toBe(true);
      expect(getItem(result.items, 0).matchConfidence).toBe('high');
      expect(getItem(result.items, 0).matchMethod).toBe('sku');
    });

    it('matches when SKU arrays have intersection', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['SKU-A', 'SKU-B'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['SKU-B', 'SKU-C'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).matchConfidence).toBe('high');
      expect(getItem(result.items, 0).matchMethod).toBe('sku');
    });
  });

  describe('variant SKU matching (high confidence)', () => {
    it('matches by variant SKU', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['VARIANT-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['MAIN-SKU'] },
          variants: [
            {
              sku: 'VARIANT-SKU',
              price: 2999,
              color: 'Blue',
            },
          ],
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).wasViewed).toBe(true);
      expect(getItem(result.items, 0).matchConfidence).toBe('high');
      expect(getItem(result.items, 0).matchMethod).toBe('variant_sku');
      expect(getItem(result.items, 0).matchedVariant).toBeDefined();
      expect(getItem(result.items, 0).matchedVariant?.sku).toBe('VARIANT-SKU');
      expect(getItem(result.items, 0).matchedVariant?.color).toBe('Blue');
    });
  });

  describe('URL matching (medium confidence)', () => {
    it('matches by exact URL', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/product/xyz',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/xyz',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('url');
    });

    it('matches URLs case-insensitively', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/Product/XYZ',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/xyz',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('url');
    });

    it('matches URLs ignoring trailing slashes', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/product/xyz/',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/xyz',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('url');
    });

    it('matches by variant URL', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/product/xyz?color=red',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/xyz',
          ids: { productIds: [], extractedIds: [] },
          variants: [
            {
              sku: 'SKU-RED',
              url: 'https://store.com/product/xyz?color=red',
            },
          ],
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('url');
      expect(getItem(result.items, 0).matchedVariant).toBeDefined();
    });
  });

  describe('extracted ID matching (medium confidence)', () => {
    it('matches by extracted ID', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: undefined,
          ids: { productIds: [], extractedIds: ['A-12345678'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['A-12345678'] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('extracted_id');
    });

    it('matches by variant extracted ID', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: undefined,
          ids: { productIds: [], extractedIds: ['VARIANT-ID'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['MAIN-ID'] },
          variants: [
            {
              sku: 'SKU',
              extractedIds: ['VARIANT-ID'],
            },
          ],
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('extracted_id');
    });
  });

  describe('title + color matching (medium confidence)', () => {
    it('matches cart title with color suffix to product title + color', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Sport Cap - White',
          url: undefined,
          imageUrl: 'https://store.com/cap.jpg', // no SKU in image URL
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Sport Cap',
          color: 'White',
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'], skus: [] },
          variants: [],
          variantCount: 0,
          hasVariants: false,
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).wasViewed).toBe(true);
      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('title_color');
    });

    it('matches cart title with color suffix to product title + variant color', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Arrival T-Shirt - Black',
          url: undefined,
          imageUrl: 'https://store.com/shirt.jpg', // no SKU in image URL
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Arrival T-Shirt',
          color: undefined, // no product-level color
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'], skus: [] },
          variants: [
            { sku: 'SHIRT-BLK', color: 'Black' },
            { sku: 'SHIRT-WHT', color: 'White' },
          ],
          variantCount: 2,
          hasVariants: true,
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).wasViewed).toBe(true);
      expect(getItem(result.items, 0).matchConfidence).toBe('medium');
      expect(getItem(result.items, 0).matchMethod).toBe('title_color');
      expect(getItem(result.items, 0).matchedVariant?.color).toBe('Black');
    });

    it('is case-insensitive for color matching', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Crest Joggers - NAVY',
          url: undefined,
          imageUrl: 'https://store.com/joggers.jpg',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Crest Joggers',
          color: 'navy', // lowercase
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'], skus: [] },
          variants: [],
          variantCount: 0,
          hasVariants: false,
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).wasViewed).toBe(true);
      expect(getItem(result.items, 0).matchMethod).toBe('title_color');
    });

    it('does not match when color does not match', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Sport Cap - Red',
          url: undefined,
          imageUrl: 'https://store.com/cap.jpg',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Sport Cap',
          color: 'Blue', // different color
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'], skus: [] },
          variants: [],
          variantCount: 0,
          hasVariants: false,
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      // Should not match via title_color, may fall back to title similarity
      expect(getItem(result.items, 0).matchMethod).not.toBe('title_color');
    });

    it('does not match when title base does not match', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Sport Cap - White',
          url: undefined,
          imageUrl: 'https://store.com/cap.jpg',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Running Hat', // different title
          color: 'White',
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'], skus: [] },
          variants: [],
          variantCount: 0,
          hasVariants: false,
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchMethod).not.toBe('title_color');
    });

    it('handles en dash and em dash separators', () => {
      // Test en dash (–)
      const cartItemsEnDash: CartProduct[] = [
        createCartItem({
          title: 'Sport Cap – White', // en dash
          url: undefined,
          imageUrl: 'https://store.com/cap.jpg',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];

      // Test em dash (—)
      const cartItemsEmDash: CartProduct[] = [
        createCartItem({
          title: 'Sport Cap — White', // em dash
          url: undefined,
          imageUrl: 'https://store.com/cap.jpg',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];

      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Sport Cap',
          color: 'White',
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'], skus: [] },
          variants: [],
          variantCount: 0,
          hasVariants: false,
        }),
      ];

      const resultEnDash = enrichCart(cartItemsEnDash, products, { minConfidence: 'medium' });
      const resultEmDash = enrichCart(cartItemsEmDash, products, { minConfidence: 'medium' });

      expect(getItem(resultEnDash.items, 0).matchMethod).toBe('title_color');
      expect(getItem(resultEmDash.items, 0).matchMethod).toBe('title_color');
    });
  });

  describe('title matching (low confidence)', () => {
    it('matches by title similarity', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: "Women's Running Shoes Size 8",
          url: undefined,
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: "Women's Running Shoes Size 8 Black",
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'low' });

      expect(getItem(result.items, 0).wasViewed).toBe(true);
      expect(getItem(result.items, 0).matchConfidence).toBe('low');
      expect(getItem(result.items, 0).matchMethod).toBe('title');
    });

    it('does not match dissimilar titles', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'iPhone 15 Pro Max',
          url: undefined,
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: "Men's Winter Jacket",
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'low' });

      expect(getItem(result.items, 0).wasViewed).toBe(false);
      expect(getItem(result.items, 0).matchConfidence).toBe('none');
    });

    it('respects custom title similarity threshold', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Test Product ABC',
          url: undefined,
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Test Product XYZ',
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'] },
        }),
      ];

      // With low threshold, should match
      const resultLow = enrichCart(cartItems, products, {
        minConfidence: 'low',
        titleSimilarityThreshold: 0.5,
      });
      expect(getItem(resultLow.items, 0).wasViewed).toBe(true);

      // With high threshold, should not match
      const resultHigh = enrichCart(cartItems, products, {
        minConfidence: 'low',
        titleSimilarityThreshold: 0.95,
      });
      expect(getItem(resultHigh.items, 0).wasViewed).toBe(false);
    });
  });

  describe('matching strategy priority', () => {
    it('prefers SKU match over URL match', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-123'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).matchMethod).toBe('sku');
      expect(getItem(result.items, 0).matchConfidence).toBe('high');
    });

    it('prefers URL match over extracted ID match', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchMethod).toBe('url');
    });
  });

  describe('confidence threshold filtering', () => {
    it('filters out low confidence matches when minConfidence is medium', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: "Women's Running Shoes",
          url: undefined,
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: "Women's Running Shoes Black",
          url: 'https://different-url.com',
          ids: { productIds: [], extractedIds: ['different'] },
        }),
      ];

      // Without threshold, should match
      const resultLow = enrichCart(cartItems, products, { minConfidence: 'low' });
      expect(getItem(resultLow.items, 0).wasViewed).toBe(true);

      // With medium threshold, title match should be filtered
      const resultMedium = enrichCart(cartItems, products, { minConfidence: 'medium' });
      expect(getItem(resultMedium.items, 0).wasViewed).toBe(false);
      expect(getItem(resultMedium.items, 0).matchConfidence).toBe('none');
    });

    it('filters out medium confidence matches when minConfidence is high', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];

      // With high threshold, URL match should be filtered
      const result = enrichCart(cartItems, products, { minConfidence: 'high' });
      expect(getItem(result.items, 0).wasViewed).toBe(false);
    });
  });

  describe('field merging', () => {
    it('prefers cart values for shared fields', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Cart Title',
          url: 'https://cart-url.com',
          imageUrl: 'https://cart-image.jpg',
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Product Title',
          url: 'https://cart-url.com',
          imageUrl: 'https://product-image.jpg',
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).title).toBe('Cart Title');
      expect(getItem(result.items, 0).imageUrl).toBe('https://cart-image.jpg');
      expect(getItem(result.items, 0).sources.title).toBe('cart');
      expect(getItem(result.items, 0).sources.imageUrl).toBe('cart');
    });

    it('falls back to product values when cart values are missing', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: undefined,
          imageUrl: undefined,
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Product Title',
          imageUrl: 'https://product-image.jpg',
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).title).toBe('Product Title');
      expect(getItem(result.items, 0).imageUrl).toBe('https://product-image.jpg');
      expect(getItem(result.items, 0).sources.title).toBe('product');
      expect(getItem(result.items, 0).sources.imageUrl).toBe('product');
    });

    it('adds product-specific fields when matched', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          brand: 'Nike',
          category: 'Footwear',
          description: 'Great shoes',
          rating: 4.8,
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).brand).toBe('Nike');
      expect(getItem(result.items, 0).category).toBe('Footwear');
      expect(getItem(result.items, 0).description).toBe('Great shoes');
      expect(getItem(result.items, 0).rating).toBe(4.8);
      expect(getItem(result.items, 0).sources.brand).toBe('product');
    });

    it('preserves cart-specific fields', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          quantity: 3,
          lineTotal: 5997,
          price: 1999,
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).quantity).toBe(3);
      expect(getItem(result.items, 0).lineTotal).toBe(5997);
      expect(getItem(result.items, 0).price).toBe(1999);
      expect(getItem(result.items, 0).sources.price).toBe('cart');
    });

    it('merges IDs from both sources', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: {
            productIds: [],
            extractedIds: ['cart-id-1', 'cart-id-2'],
            skus: ['MATCH-SKU'],
          },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: {
            productIds: ['prod-id'],
            extractedIds: ['cart-id-1', 'product-id'],
            skus: ['MATCH-SKU'],
            gtins: ['GTIN-1'],
          },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).ids.productIds).toContain('prod-id');
      expect(getItem(result.items, 0).ids.extractedIds).toContain('cart-id-1');
      expect(getItem(result.items, 0).ids.extractedIds).toContain('cart-id-2');
      expect(getItem(result.items, 0).ids.extractedIds).toContain('product-id');
      expect(getItem(result.items, 0).ids.skus).toContain('MATCH-SKU');
      expect(getItem(result.items, 0).ids.gtins).toContain('GTIN-1');
      expect(getItem(result.items, 0).sources.ids).toBe('merged');
    });
  });

  describe('provenance tracking', () => {
    it('tracks inCart and wasViewed correctly', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Matching Item ABC',
          url: 'https://store.com/matched',
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
        createCartItem({
          title: 'Completely Different XYZ 12345',
          url: 'https://store.com/unmatched',
          ids: { productIds: [], extractedIds: ['unmatched-id'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Matching Item ABC Full Description',
          url: 'https://store.com/matched',
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).inCart).toBe(true);
      expect(getItem(result.items, 0).wasViewed).toBe(true);

      expect(getItem(result.items, 1).inCart).toBe(true);
      expect(getItem(result.items, 1).wasViewed).toBe(false);
    });

    it('sets enrichedAt timestamp on each item', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['MATCH-SKU'] },
        }),
      ];

      const beforeTime = new Date().toISOString();
      const result = enrichCart(cartItems, products);
      const afterTime = new Date().toISOString();

      expect(getItem(result.items, 0).enrichedAt).toBeDefined();
      expect(getItem(result.items, 0).enrichedAt >= beforeTime).toBe(true);
      expect(getItem(result.items, 0).enrichedAt <= afterTime).toBe(true);
    });
  });

  describe('summary statistics', () => {
    it('calculates correct summary stats', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'SKU Product 1',
          url: 'https://store.com/sku-product-1',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-1'] },
        }),
        createCartItem({
          title: 'SKU Product 2',
          url: 'https://store.com/sku-product-2',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-2'] },
        }),
        createCartItem({
          title: 'Unmatched Product XYZ',
          url: 'https://store.com/unmatched',
          ids: { productIds: [], extractedIds: ['no-match'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'SKU Product 1 Full',
          url: 'https://store.com/sku-product-1-different',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-1'] },
        }),
        createProduct({
          title: 'SKU Product 2 Full',
          url: 'https://store.com/sku-product-2-different',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-2'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(result.summary.totalItems).toBe(3);
      expect(result.summary.matchedItems).toBe(2);
      expect(result.summary.unmatchedItems).toBe(1);
      expect(result.summary.matchRate).toBeCloseTo(66.67, 1);
    });

    it('calculates correct confidence breakdown', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'SKU Product',
          url: 'https://store.com/sku-product',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-1'] },
        }),
        createCartItem({
          title: 'URL Product',
          url: 'https://store.com/url-match',
          ids: { productIds: [], extractedIds: ['url-id'] },
        }),
        createCartItem({
          title: 'Unmatched Product XYZ',
          url: 'https://store.com/unmatched',
          ids: { productIds: [], extractedIds: ['no-match'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'SKU Product Full',
          url: 'https://store.com/sku-product-different',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-1'] },
        }),
        createProduct({
          title: 'URL Product Full',
          url: 'https://store.com/url-match',
          ids: { productIds: [], extractedIds: ['url-different'] },
        }),
      ];

      // Use minConfidence: 'medium' to allow URL matches
      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(result.summary.byConfidence.high).toBe(1);
      expect(result.summary.byConfidence.medium).toBe(1);
      expect(result.summary.byConfidence.none).toBe(1);
    });

    it('calculates correct method breakdown', () => {
      const cartItems: CartProduct[] = [
        createCartItem({ ids: { productIds: [], extractedIds: [], skus: ['SKU-1'] } }),
        createCartItem({
          url: 'https://store.com/url-match',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({ ids: { productIds: [], extractedIds: [], skus: ['SKU-1'] } }),
        createProduct({
          url: 'https://store.com/url-match',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];

      // Use minConfidence: 'medium' to allow URL matches
      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(result.summary.byMethod.sku).toBe(1);
      expect(result.summary.byMethod.url).toBe(1);
    });
  });

  describe('matched variant handling', () => {
    it('includes matched variant data', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          ids: { productIds: [], extractedIds: [], skus: ['VARIANT-RED'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          ids: { productIds: [], extractedIds: [], skus: ['MAIN-SKU'] },
          variants: [
            {
              sku: 'VARIANT-RED',
              url: 'https://store.com/product?color=red',
              imageUrl: 'https://store.com/red.jpg',
              price: 2499,
              currency: 'USD',
              color: 'Red',
            },
          ],
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).matchedVariant).toBeDefined();
      expect(getItem(result.items, 0).matchedVariant?.sku).toBe('VARIANT-RED');
      expect(getItem(result.items, 0).matchedVariant?.color).toBe('Red');
      expect(getItem(result.items, 0).matchedVariant?.price).toBe(2499);
      expect(getItem(result.items, 0).matchedVariant?.url).toBe(
        'https://store.com/product?color=red',
      );
    });

    it('uses variant imageUrl when cart has no imageUrl', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          imageUrl: undefined,
          ids: { productIds: [], extractedIds: [], skus: ['VARIANT-RED'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          imageUrl: 'https://store.com/main.jpg',
          ids: { productIds: [], extractedIds: [], skus: ['MAIN-SKU'] },
          variants: [
            {
              sku: 'VARIANT-RED',
              imageUrl: 'https://store.com/variant-red.jpg',
            },
          ],
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).imageUrl).toBe('https://store.com/variant-red.jpg');
    });
  });

  describe('matchedSignals - multiple match tracking', () => {
    it('returns empty matchedSignals array when no match', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Completely Different Product',
          url: undefined,
          ids: { productIds: [], extractedIds: ['no-match'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Some Other Product',
          url: 'https://different.com',
          ids: { productIds: [], extractedIds: ['different'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).matchedSignals).toEqual([]);
    });

    it('returns single signal when only one strategy matches', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Product',
          url: 'https://store.com/product/123',
          price: 1999,
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Different Title',
          url: 'https://store.com/product/123',
          price: 9999, // Different price to prevent price signal
          variants: [], // No variants to prevent variant price matching
          variantCount: 0,
          hasVariants: false,
          ids: { productIds: [], extractedIds: ['different'] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      expect(getItem(result.items, 0).matchedSignals).toHaveLength(1);
      expect(getItem(result.items, 0).matchedSignals[0]).toEqual({
        method: 'url',
        confidence: 'medium',
        exact: true,
      });
    });

    it('returns multiple signals when multiple strategies match', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Test Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'], skus: ['SKU-123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Test Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'], skus: ['SKU-123'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      // Should have: sku (high), url (medium), extracted_id (medium), title (low)
      expect(getItem(result.items, 0).matchedSignals.length).toBeGreaterThan(1);

      // Primary method should be sku (highest confidence)
      expect(getItem(result.items, 0).matchMethod).toBe('sku');
      expect(getItem(result.items, 0).matchConfidence).toBe('high');

      // Should include sku signal
      const skuSignal = getItem(result.items, 0).matchedSignals.find((s) => s.method === 'sku');
      expect(skuSignal).toEqual({ method: 'sku', confidence: 'high', exact: true });

      // Should include url signal
      const urlSignal = getItem(result.items, 0).matchedSignals.find((s) => s.method === 'url');
      expect(urlSignal).toEqual({ method: 'url', confidence: 'medium', exact: true });

      // Should include extracted_id signal
      const extractedIdSignal = getItem(result.items, 0).matchedSignals.find(
        (s) => s.method === 'extracted_id',
      );
      expect(extractedIdSignal).toEqual({
        method: 'extracted_id',
        confidence: 'medium',
        exact: true,
      });
    });

    it('sorts matchedSignals by confidence (high → medium → low)', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Test Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'], skus: ['SKU-123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Test Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'], skus: ['SKU-123'] },
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'low' });

      const signals = getItem(result.items, 0).matchedSignals;

      // Verify ordering: high confidence first, then medium, then low
      for (let i = 0; i < signals.length - 1; i++) {
        const current = signals[i]!;
        const next = signals[i + 1]!;
        const confidenceOrder = { high: 3, medium: 2, low: 1, none: 0 };
        expect(confidenceOrder[current.confidence]).toBeGreaterThanOrEqual(
          confidenceOrder[next.confidence],
        );
      }
    });

    it('includes image_sku and title_color signals when they match', () => {
      // Cart item with color in title and SKU in image URL
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Sport Cap - White',
          url: undefined,
          imageUrl: 'https://store.com/images/SportCapI3A6W_64x64.jpg',
          ids: { productIds: [], extractedIds: [] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Sport Cap',
          color: 'White',
          url: 'https://different.com',
          ids: { productIds: [], extractedIds: ['different'], skus: ['I3A6W'] },
          variants: [],
          variantCount: 0,
          hasVariants: false,
        }),
      ];

      const result = enrichCart(cartItems, products, { minConfidence: 'medium' });

      // Should have both image_sku (high) and title_color (medium) signals
      const signals = getItem(result.items, 0).matchedSignals;

      const imageSkuSignal = signals.find((s) => s.method === 'image_sku');
      expect(imageSkuSignal).toEqual({ method: 'image_sku', confidence: 'high', exact: true });

      const titleColorSignal = signals.find((s) => s.method === 'title_color');
      expect(titleColorSignal).toEqual({
        method: 'title_color',
        confidence: 'medium',
        exact: true,
      });

      // Primary method should be image_sku (highest confidence)
      expect(getItem(result.items, 0).matchMethod).toBe('image_sku');
    });

    it('clears matchedSignals when match does not meet threshold', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Test Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Test Product',
          url: 'https://store.com/product/123',
          ids: { productIds: [], extractedIds: ['123'] },
        }),
      ];

      // URL and extracted_id match with medium confidence, but minConfidence is high
      const result = enrichCart(cartItems, products, { minConfidence: 'high' });

      // Since no high confidence match, wasViewed should be false
      expect(getItem(result.items, 0).wasViewed).toBe(false);
      // And matchedSignals should be empty (not showing filtered matches)
      expect(getItem(result.items, 0).matchedSignals).toEqual([]);
    });
  });

  describe('multiple cart items and products', () => {
    it('matches multiple cart items to correct products', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Product A',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-A'] },
        }),
        createCartItem({
          title: 'Product B',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-B'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Product A Full',
          brand: 'Brand A',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-A'] },
        }),
        createProduct({
          title: 'Product B Full',
          brand: 'Brand B',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-B'] },
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).brand).toBe('Brand A');
      expect(getItem(result.items, 1).brand).toBe('Brand B');
    });

    it('handles cart items matching the same product', () => {
      const cartItems: CartProduct[] = [
        createCartItem({
          title: 'Same Product Size S',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-S'] },
        }),
        createCartItem({
          title: 'Same Product Size M',
          ids: { productIds: [], extractedIds: [], skus: ['SKU-M'] },
        }),
      ];
      const products: NormalizedProduct[] = [
        createProduct({
          title: 'Same Product',
          brand: 'Shared Brand',
          ids: { productIds: [], extractedIds: [], skus: [] },
          variants: [
            { sku: 'SKU-S', color: 'Small' },
            { sku: 'SKU-M', color: 'Medium' },
          ],
        }),
      ];

      const result = enrichCart(cartItems, products);

      expect(getItem(result.items, 0).brand).toBe('Shared Brand');
      expect(getItem(result.items, 0).matchedVariant?.color).toBe('Small');
      expect(getItem(result.items, 1).brand).toBe('Shared Brand');
      expect(getItem(result.items, 1).matchedVariant?.color).toBe('Medium');
    });
  });
});
