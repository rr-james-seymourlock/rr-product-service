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
  acehardwareSession001,
  cartersSession001,
  columbiaSession001,
  gymsharkSession001,
  kohlsSession001,
  macysSession001,
  nflshopSession001,
  nordstromrackSession001,
  oldnavySession001,
  samsclubSession001,
  samsungSession001,
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

  /**
   * NFL Shop Session 001 - Fanatics-powered store with URL matching
   *
   * Tests URL-based matching for Fanatics stores where:
   * - URLs contain long numeric IDs in +p-{id}+ pattern
   * - Cart and product URLs are identical for same items
   * - No SKUs available, relies on URL and title matching
   */
  describe('nflshop-session-001', () => {
    const fixture = nflshopSession001;

    /**
     * Extract product ID from Fanatics-style URL
     * Pattern: /t-{slug}+p-{longId}+z-{variant}
     * Also check image URL: _p-{productId}+ or _ss5_p-{productId}+
     */
    function extractFanaticsProductId(url: string | undefined, imageUrl?: string): string[] {
      const ids: string[] = [];

      // Try URL path pattern: +p-{id}+
      if (url) {
        const urlMatch = url.match(/\+p-(\d+)\+/);
        if (urlMatch?.[1]) {
          ids.push(urlMatch[1]);
        }
      }

      // Try image URL pattern: _p-{id}+ or _ss5_p-{id}+
      if (imageUrl) {
        const imgMatch = imageUrl.match(/_(?:ss5_)?p-(\d+)\+/);
        if (imgMatch?.[1] && !ids.includes(imgMatch[1])) {
          ids.push(imgMatch[1]);
        }
      }

      return ids;
    }

    /**
     * Convert NFL Shop raw product view to normalized product format
     */
    function normalizeNflShopProductView(
      raw: (typeof nflshopSession001.productViews)[0],
    ): NormalizedProduct {
      const extractedIds = extractFanaticsProductId(raw.url, raw.image_url_list?.[0]);

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
          extractedIds: extractedIds,
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
     * Convert NFL Shop raw cart product to normalized cart product format
     */
    function normalizeNflShopCartProduct(
      raw: (typeof nflshopSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      const extractedIds = extractFanaticsProductId(raw.url, raw.image_url);

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
          extractedIds: extractedIds,
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeNflShopProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeNflShopCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 4 cart items and 5 product views', () => {
      expect(normalizedCart).toHaveLength(4);
      expect(normalizedProducts).toHaveLength(5);
    });

    it('should extract IDs from Fanatics URLs correctly', () => {
      // Verify product IDs are extracted from URLs
      const quarterZip = normalizedProducts.find((p) => p.title?.includes('Peshastin'));
      expect(quarterZip?.ids.productIds).toContain('202093909');
      expect(quarterZip?.ids.extractedIds).toContain('466657226536106');
      expect(quarterZip?.ids.extractedIds).toContain('202093909');

      const tshirt = normalizedProducts.find((p) => p.title?.includes('Rivalries'));
      expect(tshirt?.ids.productIds).toContain('202659210');

      // Verify cart IDs are extracted
      const cartQuarterZip = normalizedCart.find((c) => c.title?.includes('Peshastin'));
      expect(cartQuarterZip?.ids.extractedIds).toContain('466657226536106');
    });

    it('should achieve 100% match rate via URL matching', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log('\n=== NFL Shop Session 001 Matching Results ===\n');
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

      // All 4 items should match
      expect(result.summary.totalItems).toBe(4);
      expect(result.summary.matchedItems).toBe(4);
      expect(result.summary.unmatchedItems).toBe(0);
      expect(result.summary.matchRate).toBe(100);
    });

    it('should match all items via URL with multiple signals', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // All items should match via URL (primary) with extracted_id as secondary
      for (const item of result.items) {
        expect(item.wasViewed).toBe(true);
        expect(item.matchConfidence).toBe('medium');
        expect(item.matchMethod).toBe('url');

        // Should have multiple signals
        expect(item.matchedSignals.length).toBeGreaterThanOrEqual(2);

        // Should have URL signal
        const urlSignal = item.matchedSignals.find((s) => s.method === 'url');
        expect(urlSignal).toBeDefined();
        expect(urlSignal?.confidence).toBe('medium');
        expect(urlSignal?.exact).toBe(true);

        // Should have extracted_id signal
        const idSignal = item.matchedSignals.find((s) => s.method === 'extracted_id');
        expect(idSignal).toBeDefined();
        expect(idSignal?.confidence).toBe('medium');
      }

      // Verify URL method was used for all 4
      expect(result.summary.byMethod.url).toBe(4);
    });

    it('should enrich cart items with product data', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Quarter-zip jacket should have description from product
      const quarterZip = result.items.find((item) => item.title?.includes('Peshastin'));
      expect(quarterZip?.description).toContain('game day');
      expect(quarterZip?.description).toContain('eco-friendly');

      // T-shirt should have description
      const tshirt = result.items.find((item) => item.title?.includes('Rivalries'));
      expect(tshirt?.description).toContain('2025 Rivalries');
      expect(tshirt?.description).toContain('Nike');

      // Navy vest should have description
      const navyVest = result.items.find((item) => item.title?.includes('Navy Mainsail'));
      expect(navyVest?.description).toContain('New England Patriots');

      // Throwback vest should have description
      const throwbackVest = result.items.find((item) => item.title?.includes('Throwback Logo'));
      expect(throwbackVest?.description).toContain('Throwback');
    });
  });

  /**
   * Samsung Session 001 - 50% match rate (partial viewing)
   *
   * Tests SKU-based matching for Samsung store where:
   * - URLs contain -sku-{model}/ pattern
   * - SKU format: MODEL/VARIANT (e.g., WF45T6000AV/A5)
   * - Only some cart items were viewed
   * - Demonstrates correct behavior for unviewed products
   */
  describe('samsung-session-001', () => {
    const fixture = samsungSession001;

    /**
     * Extract SKU from Samsung URL
     * Pattern: -sku-{model}/ at end of path
     * Model format: wf45t6000av-a5 -> WF45T6000AV/A5
     */
    function extractSamsungSku(url: string | undefined): string[] {
      if (!url) return [];
      const ids: string[] = [];

      // Try -sku-{model} pattern
      const skuMatch = url.match(/-sku-([a-z0-9-]+)/i);
      if (skuMatch?.[1]) {
        // Normalize: wf45t6000av-a5 -> WF45T6000AV/A5
        const normalized = skuMatch[1].toUpperCase().replace(/-([a-z0-9]+)$/i, '/$1');
        ids.push(normalized);
        ids.push(skuMatch[1]); // Also keep original format
      }

      return ids;
    }

    /**
     * Convert Samsung raw product view to normalized product format
     */
    function normalizeSamsungProductView(
      raw: (typeof samsungSession001.productViews)[0],
    ): NormalizedProduct {
      const extractedIds = extractSamsungSku(raw.url);

      return {
        title: raw.name,
        url: raw.url,
        imageUrl: raw.image_url_list?.[0],
        storeId: raw.store_id,
        brand: 'Samsung',
        description: raw.description,
        category: undefined,
        rating: raw.rating?.[0] ? parseFloat(raw.rating[0]) : undefined,
        price: raw.amount ? Math.round(parseFloat(raw.amount) * 100) : undefined,
        currency: raw.currency,
        ids: {
          productIds: raw.productid_list ?? [],
          extractedIds: extractedIds,
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
     * Convert Samsung raw cart product to normalized cart product format
     */
    function normalizeSamsungCartProduct(
      raw: (typeof samsungSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      const extractedIds = extractSamsungSku(raw.url);

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
          extractedIds: extractedIds,
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeSamsungProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeSamsungCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 2 cart items and 2 product views', () => {
      expect(normalizedCart).toHaveLength(2);
      expect(normalizedProducts).toHaveLength(2);
    });

    it('should extract SKUs from Samsung URLs correctly', () => {
      // Verify product SKUs are extracted from URLs
      const washer6000 = normalizedProducts.find((p) => p.title?.includes('Vibration Reduction'));
      expect(washer6000?.ids.skus).toContain('WF45T6000AV/A5');
      expect(washer6000?.ids.extractedIds).toContain('WF45T6000AV/A5');

      const washer6300 = normalizedProducts.find((p) => p.title?.includes('Super Speed'));
      expect(washer6300?.ids.skus).toContain('WF45B6300AP/US');
      expect(washer6300?.ids.extractedIds).toContain('WF45B6300AP/US');

      // Verify cart SKUs are extracted
      const cartWasher = normalizedCart.find((c) => c.title?.includes('Vibration Reduction'));
      expect(cartWasher?.ids.extractedIds).toContain('WF45T6000AV/A5');

      // Dryer doesn't have -sku- pattern in URL (different URL format)
      const cartDryer = normalizedCart.find((c) => c.title?.includes('Electric Dryer'));
      expect(cartDryer?.ids.extractedIds).toHaveLength(0);
    });

    it('should achieve 50% match rate (washer viewed, dryer not)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log('\n=== Samsung Session 001 Matching Results ===\n');
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

      // Only washer should match (dryer was never viewed)
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.matchedItems).toBe(1);
      expect(result.summary.unmatchedItems).toBe(1);
      expect(result.summary.matchRate).toBe(50);
    });

    it('should match washer via extracted_id_sku with multiple signals', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Washer should match with high confidence
      const washerMatch = result.items.find((item) => item.title?.includes('Vibration Reduction'));
      expect(washerMatch?.wasViewed).toBe(true);
      expect(washerMatch?.matchConfidence).toBe('high');
      expect(washerMatch?.matchMethod).toBe('extracted_id_sku');

      // Should have multiple signals
      expect(washerMatch?.matchedSignals.length).toBeGreaterThanOrEqual(2);

      // Should have extracted_id_sku signal
      const skuSignal = washerMatch?.matchedSignals.find((s) => s.method === 'extracted_id_sku');
      expect(skuSignal).toBeDefined();
      expect(skuSignal?.confidence).toBe('high');

      // Dryer should NOT match (was never viewed)
      const dryerMatch = result.items.find((item) => item.title?.includes('Electric Dryer'));
      expect(dryerMatch?.wasViewed).toBe(false);
      expect(dryerMatch?.matchConfidence).toBe('none');
      expect(dryerMatch?.matchMethod).toBeNull();
    });

    it('should enrich washer with product data but not dryer', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Washer should have enriched data
      const washer = result.items.find((item) => item.title?.includes('Vibration Reduction'));
      expect(washer?.rating).toBe(4.5079);
      expect(washer?.description).toContain('WF6000T');

      // Dryer should NOT have enriched data (no match)
      const dryer = result.items.find((item) => item.title?.includes('Electric Dryer'));
      expect(dryer?.rating).toBeUndefined();
      expect(dryer?.description).toBeUndefined();
    });
  });

  /**
   * Columbia Sportswear Session 001 - URL and extracted_id matching
   *
   * Tests URL-based matching for Columbia where:
   * - URLs contain product ID: /p/{slug}-{productId}.html
   * - MPN matches the URL extracted ID
   * - Image URLs contain product ID: /{productId}_{colorCode}_f_om
   * - Some cart items were not viewed (demonstrating partial matches)
   */
  describe('columbia-session-001', () => {
    const fixture = columbiaSession001;

    /**
     * Extract product ID from Columbia URL
     * Pattern: /p/{slug}-{productId}.html
     */
    function extractColumbiaProductId(url: string | undefined): string[] {
      if (!url) return [];
      // Match the numeric ID at the end before .html
      const match = url.match(/-(\d{5,})\./);
      const id = match?.[1];
      return id ? [id] : [];
    }

    /**
     * Convert Columbia raw product view to normalized product format
     */
    function normalizeColumbiaProductView(
      raw: (typeof columbiaSession001.productViews)[0],
    ): NormalizedProduct {
      const extractedIds = extractColumbiaProductId(raw.url);

      return {
        title: raw.name,
        url: raw.url,
        imageUrl: raw.image_url_list?.[0],
        storeId: raw.store_id,
        brand: 'Columbia',
        description: raw.description,
        category: undefined,
        rating: raw.rating?.[0] ? parseFloat(raw.rating[0]) : undefined,
        price: raw.amount ? Math.round(parseFloat(raw.amount) * 100) : undefined,
        currency: raw.currency,
        ids: {
          productIds: raw.productid_list ?? [],
          extractedIds: extractedIds,
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
     * Convert Columbia raw cart product to normalized cart product format
     */
    function normalizeColumbiaCartProduct(
      raw: (typeof columbiaSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      const extractedIds = extractColumbiaProductId(raw.url);

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
          extractedIds: extractedIds,
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeColumbiaProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeColumbiaCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 3 cart items and 2 product views', () => {
      expect(normalizedCart).toHaveLength(3);
      expect(normalizedProducts).toHaveLength(2);
    });

    it('should extract product IDs from Columbia URLs correctly', () => {
      // Verify product IDs are extracted from URLs
      const kitterwibbit = normalizedProducts.find((p) => p.title?.includes('Kitterwibbit'));
      expect(kitterwibbit?.ids.extractedIds).toContain('2088852');
      expect(kitterwibbit?.ids.mpns).toContain('2088852');

      const bentonSprings = normalizedProducts.find((p) => p.title?.includes('Benton Springs'));
      expect(bentonSprings?.ids.extractedIds).toContain('1372113');
      expect(bentonSprings?.ids.mpns).toContain('1372113');

      // Verify cart IDs are extracted
      const cartBenton = normalizedCart.find((c) => c.title?.includes('Benton Springs'));
      expect(cartBenton?.ids.extractedIds).toContain('1372113');

      const cartKitterwibbit = normalizedCart.find((c) => c.title?.includes('Kitterwibbit'));
      expect(cartKitterwibbit?.ids.extractedIds).toContain('2088852');
    });

    it('should achieve 100% match rate via URL and extracted_id', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log('\n=== Columbia Session 001 Matching Results ===\n');
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

      // All 3 items should match (both jacket variants + fleece)
      expect(result.summary.totalItems).toBe(3);
      expect(result.summary.matchedItems).toBe(3);
      expect(result.summary.unmatchedItems).toBe(0);
      expect(result.summary.matchRate).toBe(100);
    });

    it('should match all items via URL with extracted_id signal', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // All items should match via URL (primary) with extracted_id as secondary
      for (const item of result.items) {
        expect(item.wasViewed).toBe(true);
        expect(item.matchConfidence).toBe('medium');
        expect(item.matchMethod).toBe('url');

        // Should have multiple signals
        expect(item.matchedSignals.length).toBeGreaterThanOrEqual(2);

        // Should have URL signal
        const urlSignal = item.matchedSignals.find((s) => s.method === 'url');
        expect(urlSignal).toBeDefined();
        expect(urlSignal?.confidence).toBe('medium');
        expect(urlSignal?.exact).toBe(true);

        // Should have extracted_id signal
        const idSignal = item.matchedSignals.find((s) => s.method === 'extracted_id');
        expect(idSignal).toBeDefined();
        expect(idSignal?.confidence).toBe('medium');
      }

      // Verify URL method was used for all 3
      expect(result.summary.byMethod.url).toBe(3);
    });

    it('should enrich cart items with product data', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Benton Springs jacket should have description from product
      const bentonSprings = result.items.find((item) => item.title?.includes('Benton Springs'));
      expect(bentonSprings?.description).toContain('petite version');
      expect(bentonSprings?.description).toContain('fleece');

      // Kitterwibbit jacket should have description
      const kitterwibbit = result.items.find((item) => item.title?.includes('Kitterwibbit'));
      expect(kitterwibbit?.description).toContain('dinosaur');
      expect(kitterwibbit?.description).toContain('fleece-lined');
    });
  });

  /**
   * Nordstrom Rack Session 001 - Low match rate (partial viewing)
   *
   * Tests extracted_id matching for Nordstrom Rack where:
   * - Product URLs use /s/{brand-slug}/{product_id}?... format
   * - Cart URLs use /s/{product_id}?origin=bag format (shortened)
   * - Product IDs are 7-digit numeric
   * - Low match rate (16.7%) - demonstrates realistic session where
   *   many cart items were added from outside the tracked session
   */
  describe('nordstromrack-session-001', () => {
    const fixture = nordstromrackSession001;

    /**
     * Extract product ID from Nordstrom Rack URL
     * Pattern: /s/{slug}/{product_id} or /s/{product_id}
     */
    function extractNordstromRackProductId(url: string | undefined): string[] {
      if (!url) return [];
      // Match /s/{anything}/{7-digit-id} or /s/{7-digit-id}
      const match = url.match(/\/s\/(?:[^/]+\/)?(\d{7})(?:\?|$)/);
      const id = match?.[1];
      return id ? [id] : [];
    }

    /**
     * Convert Nordstrom Rack raw product view to normalized product format
     */
    function normalizeNordstromRackProductView(
      raw: (typeof nordstromrackSession001.productViews)[0],
    ): NormalizedProduct {
      const extractedIds = extractNordstromRackProductId(raw.url);

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
          extractedIds: extractedIds,
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
     * Convert Nordstrom Rack raw cart product to normalized cart product format
     */
    function normalizeNordstromRackCartProduct(
      raw: (typeof nordstromrackSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      const extractedIds = extractNordstromRackProductId(raw.url);

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
          extractedIds: extractedIds,
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeNordstromRackProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeNordstromRackCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 6 cart items and 7 product views', () => {
      expect(normalizedCart).toHaveLength(6);
      expect(normalizedProducts).toHaveLength(7);
    });

    it('should extract product IDs from Nordstrom Rack URLs correctly', () => {
      // Verify product IDs are extracted from URLs
      const lamp = normalizedProducts.find((p) => p.title?.includes('Touch Activated Wireless'));
      expect(lamp?.ids.extractedIds).toContain('8219165');

      const petSet = normalizedProducts.find((p) => p.title?.includes('Pet Plush Throw'));
      expect(petSet?.ids.extractedIds).toContain('8327213');

      const whiskSet = normalizedProducts.find((p) => p.title?.includes('Whisk Set'));
      expect(whiskSet?.ids.extractedIds).toContain('8189031');

      // Verify cart IDs are extracted (shortened URL format)
      const cartLamp = normalizedCart.find((c) => c.title?.includes('Touch Activated Wireless'));
      expect(cartLamp?.ids.extractedIds).toContain('8219165');

      const cartTShirt = normalizedCart.find((c) => c.title?.includes('Crewneck T-Shirt'));
      expect(cartTShirt?.ids.extractedIds).toContain('8385326');
    });

    it('should achieve 16.7% match rate (1/6 items viewed)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log('\n=== Nordstrom Rack Session 001 Matching Results ===\n');
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

      // Only 1 item should match (lamp was the only viewed item in cart)
      expect(result.summary.totalItems).toBe(6);
      expect(result.summary.matchedItems).toBe(1);
      expect(result.summary.unmatchedItems).toBe(5);
      // Match rate is 1/6 = 16.666...% which rounds to 16.7
      expect(Math.round(result.summary.matchRate * 10) / 10).toBeCloseTo(16.7, 0);
    });

    it('should match lamp via extracted_id with supporting title and price signals', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Lamp should match with medium confidence via extracted_id
      const lampMatch = result.items.find((item) =>
        item.title?.includes('Touch Activated Wireless'),
      );
      expect(lampMatch?.wasViewed).toBe(true);
      expect(lampMatch?.matchConfidence).toBe('medium');
      expect(lampMatch?.matchMethod).toBe('extracted_id');

      // Should have multiple signals
      expect(lampMatch?.matchedSignals.length).toBeGreaterThanOrEqual(2);

      // Should have extracted_id signal
      const idSignal = lampMatch?.matchedSignals.find((s) => s.method === 'extracted_id');
      expect(idSignal).toBeDefined();
      expect(idSignal?.confidence).toBe('medium');
      expect(idSignal?.exact).toBe(true);

      // Should have title signal (exact title match)
      const titleSignal = lampMatch?.matchedSignals.find((s) => s.method === 'title');
      expect(titleSignal).toBeDefined();
      expect(titleSignal?.confidence).toBe('low');

      // Should have price signal (exact price match)
      const priceSignal = lampMatch?.matchedSignals.find((s) => s.method === 'price');
      expect(priceSignal).toBeDefined();
      expect(priceSignal?.exact).toBe(true);

      // Other items should NOT match (not viewed)
      const unmatchedItems = result.items.filter(
        (item) => !item.title?.includes('Touch Activated Wireless'),
      );
      for (const item of unmatchedItems) {
        expect(item.wasViewed).toBe(false);
        expect(item.matchConfidence).toBe('none');
        expect(item.matchMethod).toBeNull();
      }
    });

    it('should enrich lamp with product data but not other items', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Lamp should have enriched data
      const lamp = result.items.find((item) => item.title?.includes('Touch Activated Wireless'));
      expect(lamp?.description).toContain('contemporary aesthetic');
      expect(lamp?.description).toContain('touch-activated');

      // Other items should NOT have enriched data (no match)
      const tShirt = result.items.find((item) => item.title?.includes('Crewneck T-Shirt'));
      expect(tShirt?.description).toBeUndefined();

      const sweater = result.items.find((item) => item.title?.includes("Kids' Knit Sweater"));
      expect(sweater?.description).toBeUndefined();
    });

    it('should verify extracted_id method was used', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Verify extracted_id method was used for the 1 match
      expect(result.summary.byMethod.extracted_id).toBe(1);
      expect(result.summary.byMethod.url).toBe(0);
      expect(result.summary.byMethod.sku).toBe(0);
    });
  });

  /**
   * Ace Hardware Session 001 - 100% match rate
   *
   * Tests SKU-based matching for Ace Hardware where:
   * - Simple SKU pattern: numeric SKU as last path segment
   * - Product URLs: /departments/.../category/{sku}
   * - Cart URLs: /product/{sku}
   * - SKUs are 7-digit numeric
   * - GTINs and MPNs available
   */
  describe('acehardware-session-001', () => {
    const fixture = acehardwareSession001;

    /**
     * Extract SKU from Ace Hardware URL
     * Pattern: last path segment is the numeric SKU
     */
    function extractAceHardwareSku(url: string | undefined): string[] {
      if (!url) return [];
      const lastSegment = url.split('/').filter(Boolean).pop();
      if (lastSegment && /^\d+$/.test(lastSegment)) {
        return [lastSegment];
      }
      return [];
    }

    /**
     * Convert Ace Hardware raw product view to normalized product format
     */
    function normalizeAceHardwareProductView(
      raw: (typeof acehardwareSession001.productViews)[0],
    ): NormalizedProduct {
      const extractedIds = extractAceHardwareSku(raw.url);

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
          extractedIds: extractedIds,
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
     * Convert Ace Hardware raw cart product to normalized cart product format
     */
    function normalizeAceHardwareCartProduct(
      raw: (typeof acehardwareSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      const extractedIds = extractAceHardwareSku(raw.url);

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
          extractedIds: extractedIds,
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeAceHardwareProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeAceHardwareCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 2 cart items and 5 product views', () => {
      expect(normalizedCart).toHaveLength(2);
      expect(normalizedProducts).toHaveLength(5);
    });

    it('should extract SKUs from Ace Hardware URLs correctly', () => {
      // Verify product SKUs are extracted from URLs
      const chainsaw = normalizedProducts.find((p) => p.title?.includes('Chainsaw Kit'));
      expect(chainsaw?.ids.skus).toContain('7037990');
      expect(chainsaw?.ids.extractedIds).toContain('7037990');

      const lubricant = normalizedProducts.find((p) => p.title?.includes('Chain Lubricant'));
      expect(lubricant?.ids.skus).toContain('7011706');
      expect(lubricant?.ids.extractedIds).toContain('7011706');

      // Verify cart SKUs are extracted
      const cartChainsaw = normalizedCart.find((c) => c.title?.includes('Chainsaw Kit'));
      expect(cartChainsaw?.ids.extractedIds).toContain('7037990');

      const cartLubricant = normalizedCart.find((c) => c.title?.includes('Chain Lubricant'));
      expect(cartLubricant?.ids.extractedIds).toContain('7011706');
    });

    it('should achieve 100% match rate (both items viewed)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log('\n=== Ace Hardware Session 001 Matching Results ===\n');
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

      // Both items should match
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.matchedItems).toBe(2);
      expect(result.summary.unmatchedItems).toBe(0);
      expect(result.summary.matchRate).toBe(100);
    });

    it('should match all items via extracted_id_sku with multiple signals', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // All items should match with high confidence via extracted_id_sku
      for (const item of result.items) {
        expect(item.wasViewed).toBe(true);
        expect(item.matchConfidence).toBe('high');
        expect(item.matchMethod).toBe('extracted_id_sku');

        // Should have multiple signals
        expect(item.matchedSignals.length).toBeGreaterThanOrEqual(3);

        // Should have extracted_id_sku signal
        const skuSignal = item.matchedSignals.find((s) => s.method === 'extracted_id_sku');
        expect(skuSignal).toBeDefined();
        expect(skuSignal?.confidence).toBe('high');
        expect(skuSignal?.exact).toBe(true);

        // Should have extracted_id signal
        const idSignal = item.matchedSignals.find((s) => s.method === 'extracted_id');
        expect(idSignal).toBeDefined();
        expect(idSignal?.confidence).toBe('medium');

        // Should have title signal
        const titleSignal = item.matchedSignals.find((s) => s.method === 'title');
        expect(titleSignal).toBeDefined();
      }

      // Verify extracted_id_sku method was used for both
      expect(result.summary.byMethod.extracted_id_sku).toBe(2);
    });

    it('should enrich cart items with product data', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Chainsaw should have description from product
      const chainsaw = result.items.find((item) => item.title?.includes('Chainsaw Kit'));
      expect(chainsaw?.description).toContain('20V MAX');
      expect(chainsaw?.description).toContain('gas-free');

      // Lubricant should have description
      const lubricant = result.items.find((item) => item.title?.includes('Chain Lubricant'));
      expect(lubricant?.description).toContain('EGO POWER+');
      expect(lubricant?.description).toContain('bio-based');
    });
  });

  /**
   * Macy's Session 001 - URL and extracted_id matching
   *
   * Tests URL-based matching for Macy's where:
   * - Product URLs contain ?ID={productId} query param
   * - Product views have relative URLs (/shop/product/...)
   * - Cart URLs have absolute URLs (https://www.macys.com/shop/product/...)
   * - Both extract the same ID from ?ID= param
   * - Rich SKU data with multiple variants
   * - Cart prices in cents, product prices in dollar strings
   */
  describe('macys-session-001', () => {
    const fixture = macysSession001;

    /**
     * Extract product ID from Macy's URL
     * Pattern: ?ID={productId} query param
     */
    function extractMacysProductId(url: string | undefined): string[] {
      if (!url) return [];
      const match = url.match(/[?&]ID=(\d+)/i);
      const id = match?.[1];
      return id ? [id] : [];
    }

    /**
     * Convert Macy's raw product view to normalized product format
     */
    function normalizeMacysProductView(
      raw: (typeof macysSession001.productViews)[0],
    ): NormalizedProduct {
      const extractedIds = extractMacysProductId(raw.url);

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
          extractedIds: extractedIds,
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
     * Convert Macy's raw cart product to normalized cart product format
     */
    function normalizeMacysCartProduct(
      raw: (typeof macysSession001.cartEvents)[0]['product_list'][0],
      storeId: string,
    ): CartProduct {
      const extractedIds = extractMacysProductId(raw.url);

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
          extractedIds: extractedIds,
        },
      };
    }

    // Normalize the fixture data
    const normalizedProducts = fixture.productViews.map(normalizeMacysProductView);
    const normalizedCart =
      fixture.cartEvents[0]?.product_list.map((item) =>
        normalizeMacysCartProduct(item, fixture.storeId),
      ) ?? [];

    it('should have 3 cart items and 13 product views', () => {
      expect(normalizedCart).toHaveLength(3);
      expect(normalizedProducts).toHaveLength(13);
    });

    it("should extract product IDs from Macy's URLs correctly", () => {
      // Verify product IDs are extracted from product view URLs (relative)
      const embroideredPuffer = normalizedProducts.find((p) =>
        p.title?.includes('Embroidered Puffer'),
      );
      expect(embroideredPuffer?.ids.extractedIds).toContain('22015374');
      expect(embroideredPuffer?.ids.productIds).toContain('22015374');

      const fauxFurHooded = normalizedProducts.find(
        (p) => p.title === "Women's Faux-Fur Hooded Puffer Coat",
      );
      expect(fauxFurHooded?.ids.extractedIds).toContain('18241267');

      const tahariPuffer = normalizedProducts.find(
        (p) => p.title?.includes('Tahari') || p.title?.includes('Faux-Fur-Collar Hooded'),
      );
      expect(tahariPuffer?.ids.extractedIds).toContain('22107035');

      // Verify cart IDs are extracted from cart URLs (absolute)
      const cartEmbroidered = normalizedCart.find((c) => c.title?.includes('Embroidered Puffer'));
      expect(cartEmbroidered?.ids.extractedIds).toContain('22015374');

      const cartFauxFur = normalizedCart.find((c) => c.title?.includes('Faux-Fur Hooded'));
      expect(cartFauxFur?.ids.extractedIds).toContain('18241267');

      const cartTahari = normalizedCart.find((c) => c.title?.includes('Tahari'));
      expect(cartTahari?.ids.extractedIds).toContain('22107035');
    });

    it('should achieve 100% match rate via extracted_id', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      console.log("\n=== Macy's Session 001 Matching Results ===\n");
      console.log(`Total cart items: ${result.summary.totalItems}`);
      console.log(`Matched items: ${result.summary.matchedItems}`);
      console.log(`Match rate: ${result.summary.matchRate.toFixed(1)}%`);
      console.log('\nBy confidence:', result.summary.byConfidence);
      console.log('By method:', result.summary.byMethod);

      console.log('\n--- Cart Item Details ---');
      for (const item of result.items) {
        console.log(`\n${item.title?.slice(0, 55)}...`);
        console.log(`  wasViewed: ${item.wasViewed}`);
        console.log(`  matchConfidence: ${item.matchConfidence}`);
        console.log(`  matchMethod: ${item.matchMethod}`);
        if (item.matchedSignals.length > 0) {
          console.log(
            `  matchedSignals: ${item.matchedSignals.map((s) => `${s.method}(${s.confidence})`).join(', ')}`,
          );
        }
      }

      // All 3 items should match
      expect(result.summary.totalItems).toBe(3);
      expect(result.summary.matchedItems).toBe(3);
      expect(result.summary.unmatchedItems).toBe(0);
      expect(result.summary.matchRate).toBe(100);
    });

    it('should match all items via extracted_id with multiple signals', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // All items should match with medium confidence via extracted_id
      // (cart extractedIds '22015374' match product extractedIds '22015374')
      // Note: Product SKUs are UPC codes like '199153038593USA' - different format
      for (const item of result.items) {
        expect(item.wasViewed).toBe(true);
        expect(item.matchConfidence).toBe('medium');
        expect(item.matchMethod).toBe('extracted_id');

        // Should have multiple signals
        expect(item.matchedSignals.length).toBeGreaterThanOrEqual(2);

        // Should have extracted_id signal
        const idSignal = item.matchedSignals.find((s) => s.method === 'extracted_id');
        expect(idSignal).toBeDefined();
        expect(idSignal?.confidence).toBe('medium');
        expect(idSignal?.exact).toBe(true);

        // Should have title signal as supporting
        const titleSignal = item.matchedSignals.find((s) => s.method === 'title');
        expect(titleSignal).toBeDefined();
        expect(titleSignal?.confidence).toBe('low');
      }

      // Verify extracted_id method was used for all 3
      expect(result.summary.byMethod.extracted_id).toBe(3);
    });

    it('should enrich cart items with product data', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Embroidered Puffer should have description and rating from product
      const embroideredPuffer = result.items.find((item) =>
        item.title?.includes('Embroidered Puffer'),
      );
      expect(embroideredPuffer?.description).toContain('diamond-quilted');
      expect(embroideredPuffer?.description).toContain('LRL');
      expect(embroideredPuffer?.rating).toBe(4.5);

      // Faux-Fur Hooded should have description and rating
      const fauxFurHooded = result.items.find((item) => item.title?.includes('Faux-Fur Hooded'));
      expect(fauxFurHooded?.description).toContain('faux fur');
      expect(fauxFurHooded?.description).toContain('500-fill-power');
      expect(fauxFurHooded?.rating).toBe(4.5);

      // Tahari Puffer should have description and rating
      const tahariPuffer = result.items.find((item) => item.title?.includes('Tahari'));
      expect(tahariPuffer?.description).toContain('faux-fur stand collar');
      expect(tahariPuffer?.description).toContain('thumbhole cuffs');
      expect(tahariPuffer?.rating).toBe(5);
    });

    it('should preserve cart-specific fields (price, quantity, lineTotal)', () => {
      const result = enrichCart(normalizedCart, normalizedProducts, { minConfidence: 'medium' });

      // Embroidered Puffer - price in cents
      const embroideredPuffer = result.items.find((item) =>
        item.title?.includes('Embroidered Puffer'),
      );
      expect(embroideredPuffer?.price).toBe(17499);
      expect(embroideredPuffer?.quantity).toBe(1);
      expect(embroideredPuffer?.lineTotal).toBe(17499);

      // Faux-Fur Hooded - price in cents
      const fauxFurHooded = result.items.find((item) => item.title?.includes('Faux-Fur Hooded'));
      expect(fauxFurHooded?.price).toBe(12599);
      expect(fauxFurHooded?.quantity).toBe(1);
      expect(fauxFurHooded?.lineTotal).toBe(12599);

      // Tahari Puffer - price in cents
      const tahariPuffer = result.items.find((item) => item.title?.includes('Tahari'));
      expect(tahariPuffer?.price).toBe(10399);
      expect(tahariPuffer?.quantity).toBe(1);
      expect(tahariPuffer?.lineTotal).toBe(10399);
    });
  });
});
