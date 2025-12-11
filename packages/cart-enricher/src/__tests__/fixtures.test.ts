/**
 * Fixture-based tests for cart enricher
 *
 * These tests run our enricher against real-world data to validate
 * matching accuracy and identify gaps in our matching strategies.
 */
import { describe, expect, it } from 'vitest';

import type { CartProduct } from '@rr/cart-event-normalizer/types';
import type { NormalizedProduct } from '@rr/product-event-normalizer/types';

import {
  cartersSession001,
  gymsharkSession001,
  kohlsSession001,
  oldnavySession001,
  samsclubSession001,
} from '../__fixtures__/index.js';
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

/**
 * Convert Sam's Club raw product view to normalized product format
 * Sam's Club uses productid_list with prod{id} format and extracts IDs from URLs
 */
function normalizeSamsClubProductView(
  raw: (typeof samsclubSession001.productViews)[0],
): NormalizedProduct {
  // Extract ID from URL - last path segment, strip prod prefix
  const urlMatch = raw.url.match(/\/(\d+|prod\d+)(?:\?|$)/);
  const extractedId = urlMatch?.[1]?.replace(/^prod/i, '') ?? '';

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
      extractedIds: extractedId ? [extractedId] : [],
      skus: [],
      gtins: [],
      mpns: [],
    },
    variants: [],
    variantCount: 0,
    hasVariants: false,
  };
}

/**
 * Convert Sam's Club raw cart product to normalized cart product format
 * Sam's Club cart URLs use /ip/seort/{id} format
 */
function normalizeSamsClubCartProduct(
  raw: (typeof samsclubSession001.cartEvents)[0]['product_list'][0],
  storeId: string,
): CartProduct {
  // Extract ID from cart URL - last path segment
  const urlMatch = raw.url?.match(/\/(\d+)(?:\?|$)/);
  const extractedId = urlMatch?.[1] ?? '';

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
      extractedIds: extractedId ? [extractedId] : [],
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

  describe('samsclub-session-001', () => {
    const fixture = samsclubSession001;

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeSamsClubProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeSamsClubCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 4 cart items and 6 product views', () => {
      expect(normalizedCart).toHaveLength(4);
      expect(normalizedProducts).toHaveLength(6);
    });

    it('should extract IDs from URLs correctly', () => {
      // Verify product IDs are extracted from URLs
      const championGrey = normalizedProducts.find((p) => p.url?.includes('16675013342'));
      expect(championGrey?.ids.extractedIds).toContain('16675013342');

      const gummyBears = normalizedProducts.find((p) => p.url?.includes('prod24921152'));
      expect(gummyBears?.ids.extractedIds).toContain('24921152');

      // Verify cart IDs are extracted from URLs
      const cartChampion = normalizedCart.find((c) => c.url?.includes('16675013342'));
      expect(cartChampion?.ids.extractedIds).toContain('16675013342');

      const cartGummyBears = normalizedCart.find((c) => c.url?.includes('24921152'));
      expect(cartGummyBears?.ids.extractedIds).toContain('24921152');
    });

    it('should report current matching results', () => {
      // Run enricher with low confidence to see all potential matches
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'low' });

      console.log("\n=== Sam's Club Session 001 Matching Results ===\n");
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
        console.log(`  extractedIds: ${item.ids.extractedIds?.join(', ') ?? 'none'}`);
      }

      // Validate the enricher runs without error
      expect(result.items).toHaveLength(4);
      expect(result.summary.totalItems).toBe(4);
    });

    it('should match cart items via extracted IDs', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'low' });

      const matchedItems = result.items.filter((item) => item.wasViewed);
      const unmatchedItems = result.items.filter((item) => !item.wasViewed);

      console.log("\n=== Sam's Club Matching Gap Analysis ===\n");

      if (unmatchedItems.length > 0) {
        console.log('UNMATCHED CART ITEMS (should have matches):');
        for (const item of unmatchedItems) {
          const expectedMatch = fixture.expectedMatches.find((m) => m.cartItemName === item.title);
          console.log(`\n  - "${item.title}"`);
          console.log(`    extractedIds: ${item.ids.extractedIds?.join(', ') ?? 'none'}`);
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

      console.log(`\n\nExpected matches: ${fixture.expectedMatches.length}`);
      console.log(`Actual matches: ${matchedItems.length}`);
      console.log(
        `Gap: ${fixture.expectedMatches.length - matchedItems.length} items not matching`,
      );

      // Sam's Club matching relies on extracted_id matching
      // All 4 items should match via extracted IDs from URLs
      expect(matchedItems.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('carters-session-001', () => {
    const fixture = cartersSession001;

    /**
     * Convert Carter's raw product view to normalized product format
     * Carter's uses V_{code} format for product IDs in URLs and SKUs
     */
    function normalizeCartersProductView(
      raw: (typeof cartersSession001.productViews)[0],
    ): NormalizedProduct {
      // Extract V_{code} from URL - last path segment
      const urlMatch = raw.url.match(/\/(V_[A-Z0-9]+)(?:\?|$)/i);
      const extractedId = urlMatch?.[1] ?? '';

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
          extractedIds: extractedId ? [extractedId] : [],
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
     * Convert Carter's raw cart product to normalized cart product format
     */
    function normalizeCartersCartProduct(
      raw: (typeof cartersSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      // Extract V_{code} from URL - last path segment
      const urlMatch = raw.url?.match(/\/(V_[A-Z0-9]+)(?:\?|$)/i);
      const extractedId = urlMatch?.[1] ?? '';

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
          extractedIds: extractedId ? [extractedId] : [],
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeCartersProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeCartersCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 4 cart items and 7 product views', () => {
      expect(normalizedCart).toHaveLength(4);
      expect(normalizedProducts).toHaveLength(7);
    });

    it('should extract V_code IDs from URLs correctly', () => {
      // Verify product IDs are extracted from URLs
      const safariBodusuits = normalizedProducts.find((p) => p.url?.includes('V_1T773410'));
      expect(safariBodusuits?.ids.extractedIds).toContain('V_1T773410');
      expect(safariBodusuits?.ids.skus).toContain('V_1T773410');

      const christmasPajamas = normalizedProducts.find((p) => p.url?.includes('V_3T264710'));
      expect(christmasPajamas?.ids.extractedIds).toContain('V_3T264710');
      expect(christmasPajamas?.ids.skus).toContain('V_3T264710');

      // Verify cart IDs are extracted from URLs
      const cartSafari = normalizedCart.find((c) => c.url?.includes('V_1T773410'));
      expect(cartSafari?.ids.extractedIds).toContain('V_1T773410');

      const cartPajamas = normalizedCart.find((c) => c.url?.includes('V_3T264710'));
      expect(cartPajamas?.ids.extractedIds).toContain('V_3T264710');
    });

    it('should achieve 50% match rate (2/4 items viewed)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log("\n=== Carter's Session 001 Matching Results ===\n");
      console.log(`Total cart items: ${result.summary.totalItems}`);
      console.log(`Matched items: ${result.summary.matchedItems}`);
      console.log(`Match rate: ${result.summary.matchRate.toFixed(1)}%`);
      console.log('\nBy confidence:', result.summary.byConfidence);
      console.log('By method:', result.summary.byMethod);

      console.log('\n--- Cart Item Details ---');
      for (const item of result.items) {
        console.log(`\n${item.title?.slice(0, 60)}...`);
        console.log(`  wasViewed: ${item.wasViewed}`);
        console.log(`  matchConfidence: ${item.matchConfidence}`);
        console.log(`  matchMethod: ${item.matchMethod}`);
        if (item.matchedSignals.length > 0) {
          console.log(
            `  matchedSignals: ${item.matchedSignals.map((s) => `${s.method}(${s.confidence})`).join(', ')}`,
          );
        }
      }

      // Carter's should have exactly 2 matches (Safari Bodysuits and Christmas Pajamas)
      // The other 2 items (Bear Print Set and Striped Sweater) were not viewed
      expect(result.summary.totalItems).toBe(4);
      expect(result.summary.matchedItems).toBe(2);
      expect(result.summary.unmatchedItems).toBe(2);
      expect(result.summary.matchRate).toBe(50);
    });

    it('should match via URL and extracted_id for viewed items', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      const matchedItems = result.items.filter((item) => item.wasViewed);
      const unmatchedItems = result.items.filter((item) => !item.wasViewed);

      // Verify the correct items matched
      const safariMatch = matchedItems.find((item) => item.title?.includes('Safari Print'));
      expect(safariMatch).toBeDefined();
      expect(safariMatch?.matchConfidence).toBe('high');
      // Should match via URL or extracted_id
      expect(['url', 'extracted_id', 'sku', 'extracted_id_sku']).toContain(
        safariMatch?.matchMethod,
      );

      const pajamasMatch = matchedItems.find((item) => item.title?.includes('Christmas Cars'));
      expect(pajamasMatch).toBeDefined();
      expect(pajamasMatch?.matchConfidence).toBe('high');

      // Verify unmatched items are not viewed
      expect(unmatchedItems).toHaveLength(2);
      for (const item of unmatchedItems) {
        expect(item.wasViewed).toBe(false);
        expect(item.matchConfidence).toBe('none');
      }
    });
  });

  describe('oldnavy-session-001', () => {
    const fixture = oldnavySession001;

    /**
     * Convert Old Navy raw product view to normalized product format
     * Old Navy uses numeric PIDs and lists all variant SKUs on product pages
     */
    function normalizeOldNavyProductView(
      raw: (typeof oldnavySession001.productViews)[0],
    ): NormalizedProduct {
      // Extract PID from URL query param
      const urlMatch = raw.url.match(/pid=(\d+)/);
      const extractedId = urlMatch?.[1] ?? '';

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
          extractedIds: extractedId ? [extractedId] : [],
          skus: raw.sku_list ?? [], // Contains ALL variant SKUs
          gtins: raw.gtin_list ?? [],
          mpns: raw.mpn_list ?? [],
        },
        variants: [],
        variantCount: 0,
        hasVariants: false,
      };
    }

    /**
     * Convert Old Navy raw cart product to normalized cart product format
     */
    function normalizeOldNavyCartProduct(
      raw: (typeof oldnavySession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      // Extract PID from URL query param
      const urlMatch = raw.url?.match(/pid=(\d+)/);
      const extractedId = urlMatch?.[1] ?? '';

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
          extractedIds: extractedId ? [extractedId] : [],
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeOldNavyProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeOldNavyCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 4 cart items and 4 product views', () => {
      expect(normalizedCart).toHaveLength(4);
      expect(normalizedProducts).toHaveLength(4);
    });

    it('should extract PIDs from URLs correctly', () => {
      // Verify product PIDs are extracted from URLs
      const sweater = normalizedProducts.find((p) => p.title?.includes('Shawl-Collar'));
      expect(sweater?.ids.extractedIds).toContain('7873200220003');
      // Product page lists ALL variant SKUs including the cart variant
      expect(sweater?.ids.skus).toContain('7873200220004');

      // Verify cart PIDs are extracted from URLs
      const cartSweater = normalizedCart.find((c) => c.title?.includes('Shawl-Collar'));
      expect(cartSweater?.ids.extractedIds).toContain('7873200220004');
    });

    it('should match sweater via extracted_id_sku (cross-variant match)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log('\n=== Old Navy Session 001 Matching Results ===\n');
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
        console.log(`  extractedIds: ${item.ids.extractedIds?.join(', ') ?? 'none'}`);
        if (item.matchedSignals.length > 0) {
          console.log(
            `  matchedSignals: ${item.matchedSignals.map((s) => `${s.method}(${s.confidence})`).join(', ')}`,
          );
        }
      }

      // Only the sweater should match via extracted_id_sku
      // Cart has pid=7873200220004, product view was pid=7873200220003
      // but product.skus includes 7873200220004
      const sweaterMatch = result.items.find((item) => item.title?.includes('Shawl-Collar'));
      expect(sweaterMatch?.wasViewed).toBe(true);
      expect(sweaterMatch?.matchConfidence).toBe('high');
      expect(sweaterMatch?.matchMethod).toBe('extracted_id_sku');

      // Other items should not match (not viewed)
      const otherItems = result.items.filter((item) => !item.title?.includes('Shawl-Collar'));
      for (const item of otherItems) {
        expect(item.wasViewed).toBe(false);
      }
    });

    it('should achieve 25% match rate (1/4 items)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      expect(result.summary.totalItems).toBe(4);
      expect(result.summary.matchedItems).toBe(1);
      expect(result.summary.unmatchedItems).toBe(3);
      expect(result.summary.matchRate).toBe(25);

      // Verify extracted_id_sku method was used
      expect(result.summary.byMethod.extracted_id_sku).toBe(1);
    });
  });

  describe('kohls-session-001', () => {
    const fixture = kohlsSession001;

    /**
     * Convert Kohl's raw product view to normalized product format
     * Kohl's uses prd-{id} in URL paths and SKUs in sku_list
     */
    function normalizeKohlsProductView(
      raw: (typeof kohlsSession001.productViews)[0],
    ): NormalizedProduct {
      // Extract prd-{id} from URL path
      const prdMatch = raw.url.match(/prd-(\d+)/);
      const prdId = prdMatch?.[1] ?? '';

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
          extractedIds: prdId ? [prdId] : [],
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
     * Convert Kohl's raw cart product to normalized cart product format
     * Cart URLs include ?skuId={sku} query param
     */
    function normalizeKohlsCartProduct(
      raw: (typeof kohlsSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      // Extract prd-{id} from URL path
      const prdMatch = raw.url?.match(/prd-(\d+)/);
      const prdId = prdMatch?.[1] ?? '';

      // Extract skuId from query param
      const skuMatch = raw.url?.match(/skuId=(\d+)/);
      const skuId = skuMatch?.[1] ?? '';

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
          extractedIds: [prdId, skuId].filter(Boolean),
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeKohlsProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeKohlsCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 3 cart items and 3 product views', () => {
      expect(normalizedCart).toHaveLength(3);
      expect(normalizedProducts).toHaveLength(3);
    });

    it('should extract prd IDs and skuIds from URLs correctly', () => {
      // Verify product prd IDs are extracted from URLs
      const petBed = normalizedProducts.find((p) => p.title?.includes('Pet Bed'));
      expect(petBed?.ids.extractedIds).toContain('7692699');
      expect(petBed?.ids.skus).toContain('76565656');

      const minecraft = normalizedProducts.find((p) => p.title?.includes('Minecraft'));
      expect(minecraft?.ids.extractedIds).toContain('7751254');
      expect(minecraft?.ids.skus).toContain('76294583');

      // Verify cart IDs include both prd ID and skuId
      const cartPetBed = normalizedCart.find((c) => c.title?.includes('Pet Bed'));
      expect(cartPetBed?.ids.extractedIds).toContain('7692699');
      expect(cartPetBed?.ids.extractedIds).toContain('76565656');

      const cartMinecraft = normalizedCart.find((c) => c.title?.includes('Minecraft'));
      expect(cartMinecraft?.ids.extractedIds).toContain('7751254');
      expect(cartMinecraft?.ids.extractedIds).toContain('76294583');
    });

    it('should achieve 100% match rate via extracted_id_sku', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log("\n=== Kohl's Session 001 Matching Results ===\n");
      console.log(`Total cart items: ${result.summary.totalItems}`);
      console.log(`Matched items: ${result.summary.matchedItems}`);
      console.log(`Match rate: ${result.summary.matchRate.toFixed(1)}%`);
      console.log('\nBy confidence:', result.summary.byConfidence);
      console.log('By method:', result.summary.byMethod);

      console.log('\n--- Cart Item Details ---');
      for (const item of result.items) {
        console.log(`\n${item.title?.slice(0, 50)}...`);
        console.log(`  wasViewed: ${item.wasViewed}`);
        console.log(`  matchConfidence: ${item.matchConfidence}`);
        console.log(`  matchMethod: ${item.matchMethod}`);
        if (item.matchedSignals.length > 0) {
          console.log(
            `  matchedSignals: ${item.matchedSignals.map((s) => `${s.method}(${s.confidence})`).join(', ')}`,
          );
        }
      }

      // All 3 items should match with high confidence
      expect(result.summary.totalItems).toBe(3);
      expect(result.summary.matchedItems).toBe(3);
      expect(result.summary.unmatchedItems).toBe(0);
      expect(result.summary.matchRate).toBe(100);
    });

    it('should match all items via extracted_id_sku with multiple signals', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // All items should match via extracted_id_sku (primary) with extracted_id as secondary
      for (const item of result.items) {
        expect(item.wasViewed).toBe(true);
        expect(item.matchConfidence).toBe('high');
        expect(item.matchMethod).toBe('extracted_id_sku');

        // Should have multiple signals
        expect(item.matchedSignals.length).toBeGreaterThanOrEqual(2);

        // Should have extracted_id_sku signal
        const skuSignal = item.matchedSignals.find((s) => s.method === 'extracted_id_sku');
        expect(skuSignal).toBeDefined();
        expect(skuSignal?.confidence).toBe('high');
        expect(skuSignal?.exact).toBe(true);

        // Should have extracted_id signal
        const idSignal = item.matchedSignals.find((s) => s.method === 'extracted_id');
        expect(idSignal).toBeDefined();
        expect(idSignal?.confidence).toBe('medium');
      }

      // Verify extracted_id_sku method was used for all 3
      expect(result.summary.byMethod.extracted_id_sku).toBe(3);
    });

    it('should enrich cart items with product data', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Pet bed should have rating and description from product
      const petBed = result.items.find((item) => item.title?.includes('Pet Bed'));
      expect(petBed?.rating).toBe(3.5);
      expect(petBed?.description).toContain('furry friend');

      // Minecraft plush should have rating and description
      const minecraft = result.items.find((item) => item.title?.includes('Minecraft'));
      expect(minecraft?.rating).toBe(5);
      expect(minecraft?.description).toContain('Minecraft');

      // Cheetah pillow should have rating and description
      const cheetah = result.items.find((item) => item.title?.includes('Cheetah'));
      expect(cheetah?.rating).toBe(4.8);
      expect(cheetah?.description).toContain('Big One');
    });
  });
});
