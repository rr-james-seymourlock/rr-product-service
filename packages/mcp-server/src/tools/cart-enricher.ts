/**
 * Cart Enricher MCP Tools
 *
 * Provides tools for analyzing raw session data, validating cart enrichment logic,
 * and continuously improving the matching system. These tools support:
 * 1. Data analysis - Extract store metadata, identify unique products, trace cart evolution
 * 2. System evaluation - Review matching strategies, validate ID extraction
 * 3. Implementation - Create fixtures, integrate with store onboarding MCP
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { StoreOnboardingManager } from './store-onboarding.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Raw product view event from apps/extensions (as provided by user)
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
 * Store metadata extracted from session data
 */
export interface ExtractedStoreMetadata {
  storeId: string;
  storeName: string;
  domain: string;
  isConsistent: boolean;
  inconsistencies: string[];
}

/**
 * Unique product identified from product views
 */
export interface UniqueProduct {
  name: string;
  url: string;
  viewCount: number;
  colors: string[];
  skus: string[];
  extractedIds: string[];
  priceRange: { min: number; max: number };
}

/**
 * Cart evolution snapshot
 */
export interface CartSnapshot {
  timestamp: string;
  itemCount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  cartTotal: number;
}

/**
 * Session analysis report
 */
export interface SessionAnalysisReport {
  storeMetadata: ExtractedStoreMetadata;
  productViews: {
    total: number;
    unique: number;
    products: UniqueProduct[];
  };
  cartEvents: {
    total: number;
    snapshots: CartSnapshot[];
    finalCart: CartSnapshot | null;
  };
  dataQuality: {
    missingFields: string[];
    malformedUrls: string[];
    warnings: string[];
  };
  matchPotential: {
    cartItemsWithViews: number;
    cartItemsWithoutViews: number;
    potentialMatchRate: number;
  };
}

/**
 * Matching strategy prediction
 */
export type MatchingStrategy =
  | 'sku'
  | 'variant_sku'
  | 'image_sku'
  | 'url'
  | 'extracted_id'
  | 'extracted_id_sku'
  | 'title_color'
  | 'title'
  | 'price';

/**
 * Confidence level for predictions
 */
export type PredictionConfidence = 'high' | 'medium' | 'low';

/**
 * Match prediction for a cart item
 */
export interface MatchPrediction {
  cartItemName: string;
  predictedStrategy: MatchingStrategy | null;
  confidence: PredictionConfidence;
  rationale: string;
  alternativeStrategies: MatchingStrategy[];
  hasCorrespondingView: boolean;
}

// ============================================================================
// Zod Schemas for MCP Tool Input
// ============================================================================

const RawProductViewEventSchema = z.object({
  amount: z.string(),
  app_version: z.string().optional(),
  application_subtype: z.string().optional(),
  application_type: z.string().optional(),
  color_list: z.array(z.string()).optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  gtin_list: z.array(z.string()).optional(),
  image_url_list: z.array(z.string()).optional(),
  member_guid: z.string().optional(),
  model_list: z.array(z.string()).optional(),
  mpn_list: z.array(z.string()).optional(),
  name: z.string(),
  offer_list: z
    .array(
      z.object({
        offer_amount: z.string(),
        offer_currency: z.string(),
      }),
    )
    .optional(),
  productid_list: z.array(z.string()).optional(),
  rating: z.array(z.string()).optional(),
  sku_list: z.array(z.string()).optional(),
  store_id: z.string(),
  store_name: z.string().optional(),
  url: z.string(),
  created_ts: z.string().optional(),
});

const RawCartProductSchema = z.object({
  image_url: z.string().optional(),
  item_price: z.number(),
  line_total: z.number(),
  name: z.string(),
  quantity: z.number(),
  url: z.string().optional(),
});

const RawCartEventSchema = z.object({
  app_version: z.string().optional(),
  application_subtype: z.string().optional(),
  application_type: z.string().optional(),
  cart_total: z.number(),
  cart_total_qty: z.number(),
  currency: z.string().optional(),
  member_guid: z.string().optional(),
  page_url: z.string().optional(),
  product_list: z.array(RawCartProductSchema),
  store_id: z.string(),
  store_name: z.string().optional(),
  created_ts: z.string().optional(),
});

// ============================================================================
// CartEnricherManager
// ============================================================================

export class CartEnricherManager {
  /**
   * Extract domain from a URL
   */
  static extractDomain(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Extract product ID from URL using store-onboarding analyzer
   */
  static extractProductId(url: string): string[] {
    const result = StoreOnboardingManager.analyzeUrl(url);
    return result.extractedIds;
  }

  /**
   * Extract store metadata from session data
   */
  static extractStoreMetadata(
    productViews: RawProductViewEvent[],
    cartEvents: RawCartEvent[],
  ): ExtractedStoreMetadata {
    const storeIds = new Set<string>();
    const storeNames = new Set<string>();
    const domains = new Set<string>();
    const inconsistencies: string[] = [];

    // Collect from product views
    for (const pv of productViews) {
      storeIds.add(pv.store_id);
      if (pv.store_name) storeNames.add(pv.store_name);
      const domain = this.extractDomain(pv.url);
      if (domain) domains.add(domain);
    }

    // Collect from cart events
    for (const ce of cartEvents) {
      storeIds.add(ce.store_id);
      if (ce.store_name) storeNames.add(ce.store_name);
    }

    // Check consistency
    if (storeIds.size > 1) {
      inconsistencies.push(`Multiple store IDs found: ${[...storeIds].join(', ')}`);
    }
    if (storeNames.size > 1) {
      inconsistencies.push(`Multiple store names found: ${[...storeNames].join(', ')}`);
    }
    if (domains.size > 1) {
      inconsistencies.push(`Multiple domains found: ${[...domains].join(', ')}`);
    }

    return {
      storeId: [...storeIds][0] ?? '',
      storeName: [...storeNames][0] ?? '',
      domain: [...domains][0] ?? '',
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  /**
   * Identify unique products from product views
   */
  static identifyUniqueProducts(productViews: RawProductViewEvent[]): UniqueProduct[] {
    const productMap = new Map<
      string,
      {
        name: string;
        url: string;
        viewCount: number;
        colors: Set<string>;
        skus: Set<string>;
        extractedIds: Set<string>;
        prices: number[];
      }
    >();

    for (const pv of productViews) {
      // Use URL as primary key for uniqueness
      const key = pv.url.toLowerCase();

      if (!productMap.has(key)) {
        productMap.set(key, {
          name: pv.name,
          url: pv.url,
          viewCount: 0,
          colors: new Set(),
          skus: new Set(),
          extractedIds: new Set(),
          prices: [],
        });
      }

      const product = productMap.get(key)!;
      product.viewCount++;

      // Collect colors
      if (pv.color_list) {
        for (const color of pv.color_list) {
          product.colors.add(color);
        }
      }

      // Collect SKUs
      if (pv.sku_list) {
        for (const sku of pv.sku_list) {
          product.skus.add(sku);
        }
      }

      // Extract IDs from URL
      const extractedIds = this.extractProductId(pv.url);
      for (const id of extractedIds) {
        product.extractedIds.add(id);
      }

      // Collect prices
      const price = parseFloat(pv.amount);
      if (!isNaN(price)) {
        product.prices.push(price);
      }
    }

    return [...productMap.values()].map((p) => ({
      name: p.name,
      url: p.url,
      viewCount: p.viewCount,
      colors: [...p.colors],
      skus: [...p.skus],
      extractedIds: [...p.extractedIds],
      priceRange: {
        min: Math.min(...p.prices),
        max: Math.max(...p.prices),
      },
    }));
  }

  /**
   * Trace cart evolution across events
   */
  static traceCartEvolution(cartEvents: RawCartEvent[]): CartSnapshot[] {
    // Sort by timestamp if available
    const sorted = [...cartEvents].sort((a, b) => {
      const tsA = a.created_ts ? parseInt(a.created_ts, 10) : 0;
      const tsB = b.created_ts ? parseInt(b.created_ts, 10) : 0;
      return tsA - tsB;
    });

    return sorted.map((ce) => ({
      timestamp: ce.created_ts ?? 'unknown',
      itemCount: ce.product_list.length,
      items: ce.product_list.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        price: p.item_price,
      })),
      cartTotal: ce.cart_total,
    }));
  }

  /**
   * Analyze data quality issues
   */
  static analyzeDataQuality(
    productViews: RawProductViewEvent[],
    cartEvents: RawCartEvent[],
  ): { missingFields: string[]; malformedUrls: string[]; warnings: string[] } {
    const missingFields: string[] = [];
    const malformedUrls: string[] = [];
    const warnings: string[] = [];

    // Check product views
    for (const pv of productViews) {
      if (!pv.url) missingFields.push(`Product "${pv.name}" missing URL`);
      if (!pv.sku_list || pv.sku_list.length === 0) {
        warnings.push(`Product "${pv.name}" has no SKUs`);
      }

      try {
        new URL(pv.url);
      } catch {
        malformedUrls.push(pv.url);
      }
    }

    // Check cart events
    for (const ce of cartEvents) {
      for (const item of ce.product_list) {
        if (!item.url) {
          warnings.push(`Cart item "${item.name}" missing URL`);
        }
      }
    }

    return { missingFields, malformedUrls, warnings };
  }

  /**
   * Calculate match potential between cart items and product views
   */
  static calculateMatchPotential(
    productViews: RawProductViewEvent[],
    cartItems: RawCartProduct[],
  ): { cartItemsWithViews: number; cartItemsWithoutViews: number; potentialMatchRate: number } {
    const uniqueProducts = this.identifyUniqueProducts(productViews);
    const productNames = new Set(uniqueProducts.map((p) => p.name.toLowerCase()));
    const productUrls = new Set(uniqueProducts.map((p) => p.url.toLowerCase()));
    const productExtractedIds = new Set(uniqueProducts.flatMap((p) => p.extractedIds));

    let cartItemsWithViews = 0;
    let cartItemsWithoutViews = 0;

    for (const cartItem of cartItems) {
      // Check multiple signals for potential match
      const nameMatch = productNames.has(cartItem.name.toLowerCase());
      const urlMatch = cartItem.url && productUrls.has(cartItem.url.toLowerCase());

      // Extract ID from cart item URL and check
      let extractedIdMatch = false;
      if (cartItem.url) {
        const cartExtractedIds = this.extractProductId(cartItem.url);
        extractedIdMatch = cartExtractedIds.some((id) => productExtractedIds.has(id));
      }

      if (nameMatch || urlMatch || extractedIdMatch) {
        cartItemsWithViews++;
      } else {
        cartItemsWithoutViews++;
      }
    }

    const total = cartItems.length;
    const potentialMatchRate = total > 0 ? (cartItemsWithViews / total) * 100 : 0;

    return { cartItemsWithViews, cartItemsWithoutViews, potentialMatchRate };
  }

  /**
   * Generate full session analysis report
   */
  static analyzeSession(
    productViews: RawProductViewEvent[],
    cartEvents: RawCartEvent[],
  ): SessionAnalysisReport {
    const storeMetadata = this.extractStoreMetadata(productViews, cartEvents);
    const uniqueProducts = this.identifyUniqueProducts(productViews);
    const cartSnapshots = this.traceCartEvolution(cartEvents);
    const dataQuality = this.analyzeDataQuality(productViews, cartEvents);

    // Get final cart items for match potential calculation
    const finalCart = cartSnapshots.length > 0 ? cartSnapshots[cartSnapshots.length - 1] : null;
    const finalCartItems =
      cartEvents.length > 0 ? cartEvents[cartEvents.length - 1]!.product_list : [];

    const matchPotential = this.calculateMatchPotential(productViews, finalCartItems);

    return {
      storeMetadata,
      productViews: {
        total: productViews.length,
        unique: uniqueProducts.length,
        products: uniqueProducts,
      },
      cartEvents: {
        total: cartEvents.length,
        snapshots: cartSnapshots,
        finalCart,
      },
      dataQuality,
      matchPotential,
    };
  }
}

// ============================================================================
// Match Prediction Logic
// ============================================================================

/**
 * Confidence levels for each matching strategy
 */
const STRATEGY_CONFIDENCE: Record<MatchingStrategy, PredictionConfidence> = {
  sku: 'high',
  variant_sku: 'high',
  image_sku: 'high',
  extracted_id_sku: 'high',
  url: 'medium',
  extracted_id: 'medium',
  title_color: 'medium',
  title: 'low',
  price: 'low',
};

/**
 * Parse cart title to extract base name and color suffix
 */
function parseCartTitle(title: string): { base: string; color: string | null } {
  // Pattern: "Name - Color" or "Name – Color" (with dashes)
  const separatorPattern = /\s+[-–—]\s+/;
  const parts = title.split(separatorPattern);

  if (parts.length >= 2) {
    const color = parts.pop()?.trim() ?? null;
    const base = parts.join(' - ').trim();
    return { base, color };
  }

  return { base: title.trim(), color: null };
}

/**
 * Extract SKUs from image URL filename
 */
function extractSkusFromImageUrl(imageUrl: string | undefined): string[] {
  if (!imageUrl) return [];

  const filename = imageUrl.split('/').pop() ?? '';
  const skuPattern = /([A-Z][A-Z0-9]{3,9})(?=[-_.])/g;
  const matches: string[] = [];

  let match;
  while ((match = skuPattern.exec(filename)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }

  return matches;
}

/**
 * Predict matching strategy for a cart item against product views
 */
function predictMatchForCartItem(
  cartItem: RawCartProduct,
  products: UniqueProduct[],
): MatchPrediction {
  const strategies: MatchingStrategy[] = [];
  let primaryStrategy: MatchingStrategy | null = null;
  let rationale = '';
  let hasCorrespondingView = false;

  // Extract potential identifiers from cart item
  const cartImageSkus = extractSkusFromImageUrl(cartItem.image_url);
  const cartExtractedIds = cartItem.url ? CartEnricherManager.extractProductId(cartItem.url) : [];
  const cartUrl = cartItem.url?.toLowerCase().replace(/\/+$/, '') ?? '';
  const { base: cartTitleBase, color: cartTitleColor } = parseCartTitle(cartItem.name);

  // Find matching products
  for (const product of products) {
    const productUrl = product.url.toLowerCase().replace(/\/+$/, '');
    const productSkus = product.skus;
    const productExtractedIds = product.extractedIds;
    const productColors = product.colors.map((c) => c.toLowerCase());

    // Check Image SKU → Product SKU (high confidence)
    if (cartImageSkus.length > 0 && productSkus.length > 0) {
      const imageSkuMatch = cartImageSkus.some((sku) => productSkus.includes(sku));
      if (imageSkuMatch) {
        hasCorrespondingView = true;
        if (!primaryStrategy) {
          primaryStrategy = 'image_sku';
          rationale = `Cart image URL contains SKU that matches product SKU`;
        }
        if (!strategies.includes('image_sku')) strategies.push('image_sku');
      }
    }

    // Check Extracted ID → Product SKU (high confidence)
    if (cartExtractedIds.length > 0 && productSkus.length > 0) {
      const extractedIdSkuMatch = cartExtractedIds.some((id) => productSkus.includes(id));
      if (extractedIdSkuMatch) {
        hasCorrespondingView = true;
        if (!primaryStrategy) {
          primaryStrategy = 'extracted_id_sku';
          rationale = `Cart extracted ID matches product SKU`;
        }
        if (!strategies.includes('extracted_id_sku')) strategies.push('extracted_id_sku');
      }
    }

    // Check URL match (medium confidence)
    if (cartUrl && cartUrl === productUrl) {
      hasCorrespondingView = true;
      if (!primaryStrategy) {
        primaryStrategy = 'url';
        rationale = `Cart URL matches product URL exactly`;
      }
      if (!strategies.includes('url')) strategies.push('url');
    }

    // Check Extracted ID match (medium confidence)
    if (cartExtractedIds.length > 0 && productExtractedIds.length > 0) {
      const extractedIdMatch = cartExtractedIds.some((id) => productExtractedIds.includes(id));
      if (extractedIdMatch) {
        hasCorrespondingView = true;
        if (!primaryStrategy) {
          primaryStrategy = 'extracted_id';
          rationale = `Cart extracted ID matches product extracted ID`;
        }
        if (!strategies.includes('extracted_id')) strategies.push('extracted_id');
      }
    }

    // Check Title + Color match (medium confidence)
    if (cartTitleBase && cartTitleColor) {
      const normalizedCartBase = cartTitleBase.toLowerCase();
      const normalizedCartColor = cartTitleColor.toLowerCase();
      const normalizedProductTitle = product.name.toLowerCase();

      if (
        normalizedProductTitle === normalizedCartBase &&
        productColors.includes(normalizedCartColor)
      ) {
        hasCorrespondingView = true;
        if (!primaryStrategy) {
          primaryStrategy = 'title_color';
          rationale = `Cart title "${cartTitleBase}" + color "${cartTitleColor}" matches product`;
        }
        if (!strategies.includes('title_color')) strategies.push('title_color');
      }
    }

    // Check Title match (low confidence) - fuzzy matching
    const normalizedCartTitle = cartItem.name.toLowerCase();
    const normalizedProductTitle = product.name.toLowerCase();

    // Simple containment check for prediction purposes
    if (
      normalizedProductTitle.includes(normalizedCartTitle) ||
      normalizedCartTitle.includes(normalizedProductTitle)
    ) {
      hasCorrespondingView = true;
      if (!primaryStrategy) {
        primaryStrategy = 'title';
        rationale = `Cart title similar to product title (fuzzy match)`;
      }
      if (!strategies.includes('title')) strategies.push('title');
    }

    // Check Price match (low confidence - supporting signal only)
    const cartPriceDollars = cartItem.item_price / 100;
    const productPriceMin = product.priceRange.min;
    const productPriceMax = product.priceRange.max;

    if (cartPriceDollars >= productPriceMin * 0.9 && cartPriceDollars <= productPriceMax * 1.1) {
      if (!strategies.includes('price')) strategies.push('price');
    }
  }

  // Determine confidence based on primary strategy
  const confidence: PredictionConfidence = primaryStrategy
    ? STRATEGY_CONFIDENCE[primaryStrategy]
    : 'low';

  // Build final rationale
  if (!primaryStrategy && !hasCorrespondingView) {
    rationale = 'No matching product view found - cart item was not viewed before checkout';
  } else if (!primaryStrategy) {
    primaryStrategy = 'title';
    rationale = 'Will attempt title similarity matching as fallback';
  }

  return {
    cartItemName: cartItem.name,
    predictedStrategy: primaryStrategy,
    confidence,
    rationale,
    alternativeStrategies: strategies.filter((s) => s !== primaryStrategy),
    hasCorrespondingView,
  };
}

// ============================================================================
// MCP Tool Registration
// ============================================================================

export function registerCartEnricherTools(server: McpServer) {
  createAnalyzeSessionTool(server);
  createPredictMatchesTool(server);
  createCheckStoreRegistryTool(server);
  createValidateIdExtractionTool(server);
}

function createAnalyzeSessionTool(server: McpServer) {
  return server.tool(
    'cart_analyze_session',
    'Analyze raw session data (product views + cart events) and generate a structured analysis report',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
      }),
    },
    async ({ state }) => {
      if (state.productViews.length === 0 && state.cartEvents.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No data provided. Include productViews and/or cartEvents.',
            },
          ],
        };
      }

      const report = CartEnricherManager.analyzeSession(
        state.productViews as RawProductViewEvent[],
        state.cartEvents as RawCartEvent[],
      );

      let response = `## Session Analysis Report\n\n`;

      // Store Metadata
      response += `### Store Metadata\n`;
      response += `- **Store ID:** ${report.storeMetadata.storeId}\n`;
      response += `- **Store Name:** ${report.storeMetadata.storeName}\n`;
      response += `- **Domain:** ${report.storeMetadata.domain}\n`;
      response += `- **Data Consistent:** ${report.storeMetadata.isConsistent ? '✓ Yes' : '✗ No'}\n`;
      if (report.storeMetadata.inconsistencies.length > 0) {
        response += `- **Inconsistencies:**\n`;
        for (const issue of report.storeMetadata.inconsistencies) {
          response += `  - ${issue}\n`;
        }
      }
      response += '\n';

      // Product Views Summary
      response += `### Product Views\n`;
      response += `- **Total Events:** ${report.productViews.total}\n`;
      response += `- **Unique Products:** ${report.productViews.unique}\n\n`;

      if (report.productViews.products.length > 0) {
        response += `#### Unique Products\n`;
        for (const product of report.productViews.products) {
          response += `\n**${product.name}**\n`;
          response += `- Views: ${product.viewCount}\n`;
          if (product.colors.length > 0) {
            response += `- Colors: ${product.colors.join(', ')}\n`;
          }
          if (product.skus.length > 0) {
            response += `- SKUs: ${product.skus.join(', ')}\n`;
          }
          if (product.extractedIds.length > 0) {
            response += `- Extracted IDs: ${product.extractedIds.join(', ')}\n`;
          }
          response += `- Price Range: $${product.priceRange.min} - $${product.priceRange.max}\n`;
        }
        response += '\n';
      }

      // Cart Events Summary
      response += `### Cart Events\n`;
      response += `- **Total Snapshots:** ${report.cartEvents.total}\n`;

      if (report.cartEvents.snapshots.length > 0) {
        response += `\n#### Cart Evolution\n`;
        for (let i = 0; i < report.cartEvents.snapshots.length; i++) {
          const snapshot = report.cartEvents.snapshots[i]!;
          response += `\n**Snapshot ${i + 1}** (${snapshot.itemCount} items, $${(snapshot.cartTotal / 100).toFixed(2)} total)\n`;
          for (const item of snapshot.items) {
            response += `- ${item.name} x${item.quantity} @ $${(item.price / 100).toFixed(2)}\n`;
          }
        }
        response += '\n';
      }

      // Data Quality
      response += `### Data Quality\n`;
      if (
        report.dataQuality.missingFields.length === 0 &&
        report.dataQuality.malformedUrls.length === 0 &&
        report.dataQuality.warnings.length === 0
      ) {
        response += `✓ No issues detected\n\n`;
      } else {
        if (report.dataQuality.missingFields.length > 0) {
          response += `\n**Missing Fields:**\n`;
          for (const field of report.dataQuality.missingFields) {
            response += `- ${field}\n`;
          }
        }
        if (report.dataQuality.malformedUrls.length > 0) {
          response += `\n**Malformed URLs:**\n`;
          for (const url of report.dataQuality.malformedUrls) {
            response += `- ${url}\n`;
          }
        }
        if (report.dataQuality.warnings.length > 0) {
          response += `\n**Warnings:**\n`;
          for (const warning of report.dataQuality.warnings) {
            response += `- ${warning}\n`;
          }
        }
        response += '\n';
      }

      // Match Potential
      response += `### Match Potential\n`;
      response += `- **Cart Items with Views:** ${report.matchPotential.cartItemsWithViews}\n`;
      response += `- **Cart Items without Views:** ${report.matchPotential.cartItemsWithoutViews}\n`;
      response += `- **Potential Match Rate:** ${report.matchPotential.potentialMatchRate.toFixed(1)}%\n\n`;

      // Recommendations
      response += `### Recommendations\n`;
      if (report.matchPotential.potentialMatchRate >= 80) {
        response += `✓ High match potential - proceed with fixture creation\n`;
      } else if (report.matchPotential.potentialMatchRate >= 50) {
        response += `⚠️ Medium match potential - some cart items may not have corresponding product views\n`;
      } else {
        response += `❌ Low match potential - many cart items don't have corresponding product views\n`;
      }

      if (report.storeMetadata.domain) {
        response += `\n**Next Steps:**\n`;
        response += `1. Run \`cart_check_store_registry\` to verify store ID extraction setup\n`;
        response += `2. Run \`cart_predict_matches\` to see expected matching strategies\n`;
        response += `3. Run \`cart_create_fixture\` to generate test fixture\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createPredictMatchesTool(server: McpServer) {
  return server.tool(
    'cart_predict_matches',
    'Predict which matching strategies will apply to each cart item with confidence levels',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
      }),
    },
    async ({ state }) => {
      if (state.cartEvents.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No cart events provided.' }],
        };
      }

      // Get unique products from product views
      const uniqueProducts = CartEnricherManager.identifyUniqueProducts(
        state.productViews as RawProductViewEvent[],
      );

      // Get final cart items
      const finalCartEvent = state.cartEvents[state.cartEvents.length - 1]!;
      const cartItems = finalCartEvent.product_list;

      // Predict matches for each cart item
      const predictions: MatchPrediction[] = cartItems.map((item) =>
        predictMatchForCartItem(item as RawCartProduct, uniqueProducts),
      );

      // Generate response
      let response = `## Match Predictions\n\n`;

      // Summary
      const highConfidence = predictions.filter((p) => p.confidence === 'high').length;
      const mediumConfidence = predictions.filter((p) => p.confidence === 'medium').length;
      const lowConfidence = predictions.filter((p) => p.confidence === 'low').length;
      const withViews = predictions.filter((p) => p.hasCorrespondingView).length;

      response += `### Summary\n`;
      response += `- **Total Cart Items:** ${predictions.length}\n`;
      response += `- **With Corresponding Views:** ${withViews} (${((withViews / predictions.length) * 100).toFixed(0)}%)\n`;
      response += `- **High Confidence:** ${highConfidence}\n`;
      response += `- **Medium Confidence:** ${mediumConfidence}\n`;
      response += `- **Low Confidence:** ${lowConfidence}\n\n`;

      // Strategy distribution
      const strategyCount: Record<string, number> = {};
      for (const p of predictions) {
        if (p.predictedStrategy) {
          strategyCount[p.predictedStrategy] = (strategyCount[p.predictedStrategy] ?? 0) + 1;
        }
      }

      response += `### Expected Strategy Distribution\n`;
      for (const [strategy, count] of Object.entries(strategyCount).sort((a, b) => b[1] - a[1])) {
        const confidence = STRATEGY_CONFIDENCE[strategy as MatchingStrategy];
        response += `- **${strategy}** (${confidence}): ${count} item(s)\n`;
      }
      response += '\n';

      // Individual predictions
      response += `### Individual Predictions\n`;
      for (const prediction of predictions) {
        const icon =
          prediction.confidence === 'high' ? '✓' : prediction.confidence === 'medium' ? '◐' : '○';
        response += `\n**${icon} ${prediction.cartItemName}**\n`;
        response += `- Strategy: \`${prediction.predictedStrategy ?? 'none'}\` (${prediction.confidence} confidence)\n`;
        response += `- Rationale: ${prediction.rationale}\n`;
        if (prediction.alternativeStrategies.length > 0) {
          response += `- Alternative signals: ${prediction.alternativeStrategies.join(', ')}\n`;
        }
        if (!prediction.hasCorrespondingView) {
          response += `- ⚠️ No matching product view found\n`;
        }
      }

      // Recommendations
      response += `\n### Recommendations\n`;
      if (highConfidence === predictions.length) {
        response += `✓ All items expected to match with high confidence\n`;
      } else if (lowConfidence > 0) {
        response += `⚠️ ${lowConfidence} item(s) may match with low confidence - review title similarity threshold\n`;
      }

      const noViewItems = predictions.filter((p) => !p.hasCorrespondingView);
      if (noViewItems.length > 0) {
        response += `\n**Items without product views:**\n`;
        for (const item of noViewItems) {
          response += `- ${item.cartItemName}\n`;
        }
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createCheckStoreRegistryTool(server: McpServer) {
  return server.tool(
    'cart_check_store_registry',
    'Verify store is configured in store-registry for ID extraction, using session data to auto-detect store',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
      }),
    },
    async ({ state }) => {
      if (state.productViews.length === 0 && state.cartEvents.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No session data provided.' }],
        };
      }

      // Extract store metadata from session data
      const storeMetadata = CartEnricherManager.extractStoreMetadata(
        state.productViews as RawProductViewEvent[],
        state.cartEvents as RawCartEvent[],
      );

      const { storeId, storeName, domain } = storeMetadata;

      if (!storeId && !domain) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Could not extract store ID or domain from session data.',
            },
          ],
        };
      }

      // Check store registry using existing store onboarding manager
      const storeCheck = await StoreOnboardingManager.checkStoreExists(storeId, domain);
      const fixtureExists = domain ? await StoreOnboardingManager.fixtureExists(domain) : false;

      // Test ID extraction on sample URLs
      const sampleUrls = (state.productViews as RawProductViewEvent[])
        .slice(0, 5)
        .map((pv) => pv.url);

      const extractionResults = sampleUrls.map((url) => ({
        url,
        extractedIds: CartEnricherManager.extractProductId(url),
      }));

      const successfulExtractions = extractionResults.filter((r) => r.extractedIds.length > 0);
      const extractionRate =
        sampleUrls.length > 0 ? (successfulExtractions.length / sampleUrls.length) * 100 : 0;

      // Generate response
      let response = `## Store Registry Check\n\n`;

      // Store metadata
      response += `### Detected Store\n`;
      response += `- **Store ID:** ${storeId || 'Not found'}\n`;
      response += `- **Store Name:** ${storeName || 'Not found'}\n`;
      response += `- **Domain:** ${domain || 'Not found'}\n\n`;

      // Config status
      response += `### Store Registry Status\n`;
      if (storeCheck.exists) {
        response += `✓ **Store config exists** in store-registry\n`;
        if (storeCheck.existingById) {
          response += `  - Found by ID: ${storeCheck.existingStoreId}\n`;
        }
        if (storeCheck.existingByDomain) {
          response += `  - Found by domain: ${storeCheck.existingDomain}\n`;
        }
      } else {
        response += `✗ **No store config found** in store-registry\n`;
      }

      // Fixture status
      response += `\n### Test Fixture Status\n`;
      if (fixtureExists) {
        response += `✓ **Fixture exists** for ${domain}\n`;
        response += `  - Path: ${StoreOnboardingManager.getFixturePath(domain!)}\n`;
      } else {
        response += `✗ **No fixture found** for ${domain}\n`;
      }

      // ID extraction test
      response += `\n### ID Extraction Test\n`;
      response += `Tested ${sampleUrls.length} URLs from product views:\n`;
      response += `- **Successful extractions:** ${successfulExtractions.length}/${sampleUrls.length} (${extractionRate.toFixed(0)}%)\n\n`;

      if (extractionResults.length > 0) {
        response += `**Sample Results:**\n`;
        for (const result of extractionResults.slice(0, 3)) {
          const shortUrl =
            result.url.length > 60 ? result.url.substring(0, 60) + '...' : result.url;
          if (result.extractedIds.length > 0) {
            response += `- ✓ \`${shortUrl}\`\n`;
            response += `  → IDs: ${result.extractedIds.join(', ')}\n`;
          } else {
            response += `- ✗ \`${shortUrl}\`\n`;
            response += `  → No IDs extracted\n`;
          }
        }
      }

      // Recommendations
      response += `\n### Recommendations\n`;

      if (storeCheck.exists && fixtureExists && extractionRate >= 80) {
        response += `✓ **Store is fully configured** - ID extraction working well\n`;
        response += `- Proceed with \`cart_predict_matches\` and fixture creation\n`;
      } else if (storeCheck.exists && !fixtureExists) {
        response += `⚠️ **Store config exists but no fixture**\n`;
        response += `- Run \`store_generate_fixture\` with session URLs to create test coverage\n`;
      } else if (!storeCheck.exists && fixtureExists) {
        response += `⚠️ **Fixture exists but no store config**\n`;
        response += `- Generic rules may work! Run \`store_run_tests\` to verify\n`;
        response += `- If tests pass, no store-specific config needed\n`;
      } else if (!storeCheck.exists && extractionRate >= 80) {
        response += `⚠️ **Generic extraction working** (${extractionRate.toFixed(0)}% success)\n`;
        response += `- Consider creating a fixture with \`store_generate_fixture\` for test coverage\n`;
        response += `- Store-specific config may not be needed\n`;
      } else {
        response += `❌ **Store needs onboarding**\n`;
        response += `1. Run \`store_validate_metadata\` with storeId="${storeId}" domain="${domain}"\n`;
        response += `2. Run \`store_filter_urls\` to prepare product URLs\n`;
        response += `3. Run \`store_generate_fixture\` to create test fixture\n`;
        response += `4. Run \`store_run_tests\` - if generic rules work, you're done!\n`;
        response += `5. If tests fail, run \`store_insert_config\` to add store-specific patterns\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createValidateIdExtractionTool(server: McpServer) {
  return server.tool(
    'cart_validate_id_extraction',
    'Run ID extraction on all session URLs and compare results between products and cart items',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
      }),
    },
    async ({ state }) => {
      if (state.productViews.length === 0 && state.cartEvents.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No session data provided.' }],
        };
      }

      // Extract IDs from all product view URLs
      const productExtractions = (state.productViews as RawProductViewEvent[]).map((pv) => ({
        name: pv.name,
        url: pv.url,
        extractedIds: CartEnricherManager.extractProductId(pv.url),
        skusFromData: pv.sku_list ?? [],
      }));

      // Extract IDs from cart item URLs
      const finalCartEvent =
        state.cartEvents.length > 0 ? state.cartEvents[state.cartEvents.length - 1] : null;
      const cartExtractions = finalCartEvent
        ? finalCartEvent.product_list.map((item) => ({
            name: item.name,
            url: item.url,
            extractedIds: item.url ? CartEnricherManager.extractProductId(item.url) : [],
            imageUrl: item.image_url,
            imageSkus: extractSkusFromImageUrl(item.image_url),
          }))
        : [];

      // Calculate statistics
      const productUrlsWithIds = productExtractions.filter((p) => p.extractedIds.length > 0);
      const productUrlsWithoutIds = productExtractions.filter((p) => p.extractedIds.length === 0);
      const cartUrlsWithIds = cartExtractions.filter(
        (c) => c.extractedIds.length > 0 || c.imageSkus.length > 0,
      );
      const cartUrlsWithoutIds = cartExtractions.filter(
        (c) => c.extractedIds.length === 0 && c.imageSkus.length === 0 && c.url,
      );
      const cartItemsWithoutUrls = cartExtractions.filter((c) => !c.url);

      // Build map of all product extracted IDs
      const allProductIds = new Set<string>();
      for (const p of productExtractions) {
        for (const id of p.extractedIds) {
          allProductIds.add(id);
        }
        for (const sku of p.skusFromData) {
          allProductIds.add(sku);
        }
      }

      // Check cart ID matches against products
      const cartMatches = cartExtractions.map((cart) => {
        const urlIdMatch = cart.extractedIds.some((id) => allProductIds.has(id));
        const imageSkuMatch = cart.imageSkus.some((sku) => allProductIds.has(sku));
        return {
          ...cart,
          urlIdMatch,
          imageSkuMatch,
          hasMatch: urlIdMatch || imageSkuMatch,
        };
      });

      const matchingCartItems = cartMatches.filter((c) => c.hasMatch);
      const nonMatchingCartItems = cartMatches.filter((c) => !c.hasMatch && (c.url || c.imageUrl));

      // Generate response
      let response = `## ID Extraction Validation\n\n`;

      // Product URLs
      response += `### Product View URLs\n`;
      response += `- **Total URLs:** ${productExtractions.length}\n`;
      response += `- **Successful extractions:** ${productUrlsWithIds.length} (${((productUrlsWithIds.length / productExtractions.length) * 100).toFixed(0)}%)\n`;
      response += `- **Failed extractions:** ${productUrlsWithoutIds.length}\n\n`;

      if (productUrlsWithoutIds.length > 0) {
        response += `**URLs without extracted IDs:**\n`;
        for (const p of productUrlsWithoutIds.slice(0, 5)) {
          response += `- ${p.name}\n`;
          response += `  URL: ${p.url}\n`;
        }
        if (productUrlsWithoutIds.length > 5) {
          response += `  ... and ${productUrlsWithoutIds.length - 5} more\n`;
        }
        response += '\n';
      }

      // Cart URLs
      response += `### Cart Item URLs\n`;
      response += `- **Total items:** ${cartExtractions.length}\n`;
      response += `- **Items with URLs:** ${cartExtractions.filter((c) => c.url).length}\n`;
      response += `- **Items without URLs:** ${cartItemsWithoutUrls.length}\n`;
      response += `- **Successful extractions:** ${cartUrlsWithIds.length}\n`;
      response += `- **Failed extractions:** ${cartUrlsWithoutIds.length}\n\n`;

      // ID Comparison
      response += `### ID Comparison (Cart → Product)\n`;
      response += `- **Cart items matching product IDs:** ${matchingCartItems.length}/${cartExtractions.length}\n`;
      response += `- **Cart items NOT matching:** ${nonMatchingCartItems.length}\n\n`;

      if (matchingCartItems.length > 0) {
        response += `**Matching Items:**\n`;
        for (const item of matchingCartItems.slice(0, 5)) {
          response += `- ✓ ${item.name}\n`;
          if (item.urlIdMatch) {
            response += `  URL IDs: ${item.extractedIds.join(', ')}\n`;
          }
          if (item.imageSkuMatch) {
            response += `  Image SKUs: ${item.imageSkus.join(', ')}\n`;
          }
        }
        if (matchingCartItems.length > 5) {
          response += `  ... and ${matchingCartItems.length - 5} more\n`;
        }
        response += '\n';
      }

      if (nonMatchingCartItems.length > 0) {
        response += `**Non-matching Items:**\n`;
        for (const item of nonMatchingCartItems) {
          response += `- ✗ ${item.name}\n`;
          if (item.url) {
            response += `  URL: ${item.url}\n`;
            response += `  Extracted IDs: ${item.extractedIds.length > 0 ? item.extractedIds.join(', ') : 'none'}\n`;
          }
          if (item.imageUrl && item.imageSkus.length > 0) {
            response += `  Image SKUs: ${item.imageSkus.join(', ')}\n`;
          }
        }
        response += '\n';
      }

      // Impact assessment
      response += `### Impact on Matching Accuracy\n`;
      const potentialMatchRate =
        cartExtractions.length > 0 ? (matchingCartItems.length / cartExtractions.length) * 100 : 0;

      if (potentialMatchRate >= 80) {
        response += `✓ **High ID overlap** (${potentialMatchRate.toFixed(0)}%) - extracted_id matching should work well\n`;
      } else if (potentialMatchRate >= 50) {
        response += `⚠️ **Medium ID overlap** (${potentialMatchRate.toFixed(0)}%) - some items may need fallback strategies\n`;
      } else {
        response += `❌ **Low ID overlap** (${potentialMatchRate.toFixed(0)}%) - ID extraction may need improvement\n`;
      }

      if (productUrlsWithoutIds.length > 0) {
        response += `\n⚠️ ${productUrlsWithoutIds.length} product URLs failed ID extraction - consider updating store-registry patterns\n`;
      }

      if (cartItemsWithoutUrls.length > 0) {
        response += `\n📝 ${cartItemsWithoutUrls.length} cart items have no URLs - will rely on image_sku or title matching\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}
