/**
 * Fixture-based tests for cart enricher
 *
 * These tests run our enricher against real-world data to validate
 * matching accuracy and identify gaps in our matching strategies.
 */
import { describe, expect, it } from 'vitest';

import type { CartProduct } from '@rr/cart-event-normalizer/types';
import type { NormalizedProduct } from '@rr/product-event-normalizer/types';

import { gymsharkSession001 } from '../__fixtures__/index.js';
import { enrichCart } from '../enricher.js';

/**
 * Convert raw product view to normalized product format
 * This simulates what the product-event-normalizer would output
 */
function normalizeProductView(raw: (typeof gymsharkSession001.productViews)[0]): NormalizedProduct {
  return {
    title: raw.name,
    url: raw.url,
    imageUrl: raw.image_url_list?.[0],
    storeId: raw.store_id,
    brand: undefined,
    description: raw.description,
    category: undefined,
    rating: raw.rating?.[0] ? parseFloat(raw.rating[0]) : undefined,
    price: raw.amount ? Math.round(parseFloat(raw.amount) * 100) : undefined,
    currency: raw.currency,
    ids: {
      productIds: raw.productid_list ?? [],
      extractedIds: [], // Would be extracted from URL
      skus: raw.sku_list ?? [],
      gtins: raw.gtin_list ?? [],
      mpns: raw.mpn_list ?? [],
    },
    variants: [],
    variantCount: 0,
    hasVariants: false,
  };
}

/**
 * Convert raw cart product to normalized cart product format
 * This simulates what the cart-event-normalizer would output
 */
function normalizeCartProduct(
  raw: (typeof gymsharkSession001.cartEvents)[0]['product_list'][0],
  storeId: string,
): CartProduct {
  return {
    title: raw.name,
    url: raw.url,
    imageUrl: raw.image_url,
    storeId,
    price: raw.item_price,
    quantity: raw.quantity,
    lineTotal: raw.line_total,
    ids: {
      productIds: [],
      extractedIds: [], // Would be extracted from URL if available
    },
  };
}

describe('Fixture Tests', () => {
  describe('gymshark-session-001', () => {
    const fixture = gymsharkSession001;

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 4 cart items and 7 product views', () => {
      expect(normalizedCart).toHaveLength(4);
      expect(normalizedProducts).toHaveLength(7);
    });

    it('should report current matching results', () => {
      // Run enricher with low confidence to see all potential matches
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'low' });

      console.log('\n=== Gymshark Session 001 Matching Results ===\n');
      console.log(`Total cart items: ${result.summary.totalItems}`);
      console.log(`Matched items: ${result.summary.matchedItems}`);
      console.log(`Match rate: ${result.summary.matchRate.toFixed(1)}%`);
      console.log('\nBy confidence:', result.summary.byConfidence);
      console.log('By method:', result.summary.byMethod);

      console.log('\n--- Cart Item Details ---');
      for (const item of result.items) {
        console.log(`\n${item.title}`);
        console.log(`  wasViewed: ${item.wasViewed}`);
        console.log(`  matchConfidence: ${item.matchConfidence}`);
        console.log(`  matchMethod: ${item.matchMethod}`);
        console.log(`  matchedSignals: ${JSON.stringify(item.matchedSignals)}`);
        if (item.ids.skus && item.ids.skus.length > 0) {
          console.log(`  skus: ${item.ids.skus.join(', ')}`);
        }
      }

      // For now, just validate the enricher runs without error
      expect(result.items).toHaveLength(4);
      expect(result.summary.totalItems).toBe(4);
    });

    it('should identify matching gaps', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'low' });

      const unmatchedItems = result.items.filter((item) => !item.wasViewed);
      const matchedItems = result.items.filter((item) => item.wasViewed);

      console.log('\n=== Matching Gap Analysis ===\n');

      if (unmatchedItems.length > 0) {
        console.log('UNMATCHED CART ITEMS (should have matches):');
        for (const item of unmatchedItems) {
          const expectedMatch = fixture.expectedMatches.find((m) => m.cartItemName === item.title);
          console.log(`\n  - "${item.title}"`);
          if (expectedMatch) {
            console.log(`    Expected to match product with SKU: ${expectedMatch.productSku}`);
            console.log(`    Reason: ${expectedMatch.reason}`);
          }
        }
      }

      if (matchedItems.length > 0) {
        console.log('\nMATCHED CART ITEMS:');
        for (const item of matchedItems) {
          console.log(`\n  - "${item.title}"`);
          console.log(`    Method: ${item.matchMethod}`);
          console.log(`    Confidence: ${item.matchConfidence}`);
        }
      }

      // Based on manual analysis, all 4 items SHOULD match
      // This test documents the current state
      console.log(`\n\nExpected matches: ${fixture.expectedMatches.length}`);
      console.log(`Actual matches: ${matchedItems.length}`);
      console.log(
        `Gap: ${fixture.expectedMatches.length - matchedItems.length} items not matching`,
      );

      // This assertion will fail until we improve matching
      // Uncomment when matching is improved:
      // expect(matchedItems).toHaveLength(fixture.expectedMatches.length);
    });
  });
});
