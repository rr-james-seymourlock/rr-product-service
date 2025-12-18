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
  createCreateFixtureTool(server);
  createRunFullAnalysisTool(server);
  createReviewMatchingLogicTool(server);
  createSuggestImprovementsTool(server);
  createAppendStoreUrlsTool(server);
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

function createCreateFixtureTool(server: McpServer) {
  return server.tool(
    'cart_create_fixture',
    'Generate a cart-enricher fixture TypeScript file from analyzed session data',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
        fixtureName: z
          .string()
          .optional()
          .describe(
            'Optional fixture name (e.g., "macys-session-001"). Auto-generated from store name if not provided.',
          ),
        fixtureDescription: z.string().optional().describe('Optional description for the fixture'),
      }),
    },
    async ({ state }) => {
      if (state.productViews.length === 0 && state.cartEvents.length === 0) {
        return {
          content: [
            { type: 'text', text: 'Error: No session data provided for fixture generation.' },
          ],
        };
      }

      // Extract store metadata
      const storeMetadata = CartEnricherManager.extractStoreMetadata(
        state.productViews as RawProductViewEvent[],
        state.cartEvents as RawCartEvent[],
      );

      // Generate fixture name from store name if not provided
      const storeName = storeMetadata.storeName || 'unknown-store';
      const storeSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const fixtureName = state.fixtureName || `${storeSlug}-session-001`;

      // Get unique products
      const uniqueProducts = CartEnricherManager.identifyUniqueProducts(
        state.productViews as RawProductViewEvent[],
      );

      // Get final cart event
      const finalCartEvent =
        state.cartEvents.length > 0 ? state.cartEvents[state.cartEvents.length - 1] : null;
      const cartItems = finalCartEvent ? finalCartEvent.product_list : [];

      // Generate match predictions for expected matches
      const predictions: MatchPrediction[] = cartItems.map((item) =>
        predictMatchForCartItem(item as RawCartProduct, uniqueProducts),
      );

      // Generate description
      const description =
        state.fixtureDescription ||
        `${uniqueProducts.length} unique product views and ${cartItems.length} cart items`;

      // Build expected matches from predictions
      const expectedMatches: Array<{
        cartItemName: string;
        productSku: string;
        confidence: 'high' | 'medium' | 'low';
        reason: string;
      }> = [];

      for (const prediction of predictions) {
        // Find matching product to get a representative SKU/ID
        const cartItem = cartItems.find((c) => c.name === prediction.cartItemName);
        const matchingProduct = uniqueProducts.find((p) => {
          // Match by extracted ID or title
          if (cartItem?.url) {
            const cartExtractedIds = CartEnricherManager.extractProductId(cartItem.url);
            if (cartExtractedIds.some((id) => p.extractedIds.includes(id))) {
              return true;
            }
          }
          return p.name.toLowerCase().includes(prediction.cartItemName.toLowerCase());
        });

        // Get product SKU - prefer extracted ID, then SKU from data
        let productSku = 'UNKNOWN';
        if (matchingProduct) {
          if (matchingProduct.extractedIds.length > 0) {
            productSku = matchingProduct.extractedIds[0]!;
          } else if (matchingProduct.skus.length > 0) {
            productSku = matchingProduct.skus[0]!;
          }
        }

        expectedMatches.push({
          cartItemName: prediction.cartItemName,
          productSku,
          confidence: prediction.confidence,
          reason: prediction.rationale,
        });
      }

      // Generate fixture TypeScript code
      const fixtureCode = generateFixtureCode({
        fixtureName,
        description,
        storeId: storeMetadata.storeId,
        storeName: storeMetadata.storeName,
        expectedMatches,
        productViews: state.productViews as RawProductViewEvent[],
        cartEvents: state.cartEvents as RawCartEvent[],
        uniqueProducts,
      });

      // Generate response
      let response = `## Generated Fixture\n\n`;
      response += `**Name:** ${fixtureName}\n`;
      response += `**Description:** ${description}\n`;
      response += `**Store:** ${storeMetadata.storeName} (${storeMetadata.storeId})\n\n`;

      response += `### Summary\n`;
      response += `- **Unique Product Views:** ${uniqueProducts.length}\n`;
      response += `- **Cart Items:** ${cartItems.length}\n`;
      response += `- **Expected Matches:** ${expectedMatches.length}\n\n`;

      response += `### Expected Matches\n`;
      for (const match of expectedMatches) {
        const icon = match.confidence === 'high' ? '✓' : match.confidence === 'medium' ? '◐' : '○';
        response += `- ${icon} **${match.cartItemName}** → \`${match.productSku}\` (${match.confidence})\n`;
        response += `  ${match.reason}\n`;
      }

      response += `\n### File Path\n`;
      response += `\`packages/cart-enricher/src/__fixtures__/${fixtureName}.ts\`\n\n`;

      response += `### Generated Code\n\n`;
      response += '```typescript\n';
      response += fixtureCode;
      response += '\n```\n\n';

      response += `### Next Steps\n`;
      response += `1. Review the generated fixture code\n`;
      response += `2. Copy the code to \`packages/cart-enricher/src/__fixtures__/${fixtureName}.ts\`\n`;
      response += `3. Update \`packages/cart-enricher/src/__fixtures__/index.ts\` to export the fixture\n`;
      response += `4. Run tests: \`pnpm --filter @rr/cart-enricher test\`\n`;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

/**
 * Generate TypeScript fixture code
 */
function generateFixtureCode(params: {
  fixtureName: string;
  description: string;
  storeId: string;
  storeName: string;
  expectedMatches: Array<{
    cartItemName: string;
    productSku: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  productViews: RawProductViewEvent[];
  cartEvents: RawCartEvent[];
  uniqueProducts: UniqueProduct[];
}): string {
  const {
    fixtureName,
    description,
    storeId,
    storeName,
    expectedMatches,
    productViews,
    cartEvents,
  } = params;

  // Deduplicate product views - keep first occurrence of each unique product
  const seenUrls = new Set<string>();
  const deduplicatedViews = productViews.filter((pv) => {
    const key = pv.url.toLowerCase();
    if (seenUrls.has(key)) return false;
    seenUrls.add(key);
    return true;
  });

  let code = `/**
 * ${storeName} Session Fixture - Real user browsing session
 *
 * ${description}
 *
 * Key characteristics:
`;

  // Add key characteristics based on data analysis
  const hasUrls = cartEvents.some((ce) => ce.product_list.some((p) => p.url));
  const hasImageUrls = cartEvents.some((ce) => ce.product_list.some((p) => p.image_url));
  const hasSkus = productViews.some((pv) => pv.sku_list && pv.sku_list.length > 0);

  if (hasUrls) {
    code += ` * - Cart items have URLs for ID extraction\n`;
  }
  if (hasImageUrls) {
    code += ` * - Cart items have image URLs for SKU extraction\n`;
  }
  if (hasSkus) {
    code += ` * - Product views include SKU data\n`;
  }
  code += ` */
import type { CartEnricherFixture, RawCartEvent, RawProductViewEvent } from './types.js';

export const fixture: CartEnricherFixture = {
  name: '${fixtureName}',
  description: '${description}',
  storeId: '${storeId}',
  storeName: '${storeName}',

  /**
   * Expected matches based on analysis:
`;

  for (const match of expectedMatches) {
    code += `   * - ${match.cartItemName} → ${match.productSku} (${match.confidence}): ${match.reason}\n`;
  }

  code += `   */
  expectedMatches: [
`;

  for (const match of expectedMatches) {
    code += `    {
      cartItemName: ${JSON.stringify(match.cartItemName)},
      productSku: ${JSON.stringify(match.productSku)},
      confidence: '${match.confidence}' as const,
      reason: ${JSON.stringify(match.reason)},
    },
`;
  }

  code += `  ],

  /**
   * Raw product view events from the session (deduplicated - first occurrence only)
   */
  productViews: ${JSON.stringify(deduplicatedViews, null, 4)} as RawProductViewEvent[],

  /**
   * Raw cart events from the session
   */
  cartEvents: ${JSON.stringify(cartEvents, null, 4)} as RawCartEvent[],
};

export default fixture;
`;

  return code;
}

function createRunFullAnalysisTool(server: McpServer) {
  return server.tool(
    'cart_run_full_analysis',
    'Run the complete cart enricher analysis workflow: session analysis, store registry check, ID extraction validation, match predictions, and fixture generation',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
        generateFixture: z
          .boolean()
          .default(true)
          .describe('Whether to generate fixture code (default: true)'),
        fixtureName: z.string().optional().describe('Optional fixture name for generated code'),
      }),
    },
    async ({ state }) => {
      if (state.productViews.length === 0 && state.cartEvents.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No session data provided.' }],
        };
      }

      const productViews = state.productViews as RawProductViewEvent[];
      const cartEvents = state.cartEvents as RawCartEvent[];

      let response = `# Cart Enricher Full Analysis Report\n\n`;
      response += `_Generated: ${new Date().toISOString()}_\n\n`;

      // ========================================================================
      // Step 1: Session Analysis
      // ========================================================================
      response += `---\n## 1. Session Analysis\n\n`;

      const sessionReport = CartEnricherManager.analyzeSession(productViews, cartEvents);

      // Store metadata
      response += `### Store Information\n`;
      response += `| Property | Value |\n`;
      response += `|----------|-------|\n`;
      response += `| Store ID | ${sessionReport.storeMetadata.storeId} |\n`;
      response += `| Store Name | ${sessionReport.storeMetadata.storeName} |\n`;
      response += `| Domain | ${sessionReport.storeMetadata.domain} |\n`;
      response += `| Data Consistent | ${sessionReport.storeMetadata.isConsistent ? '✓ Yes' : '✗ No'} |\n\n`;

      if (sessionReport.storeMetadata.inconsistencies.length > 0) {
        response += `**Inconsistencies:**\n`;
        for (const issue of sessionReport.storeMetadata.inconsistencies) {
          response += `- ⚠️ ${issue}\n`;
        }
        response += '\n';
      }

      // Product views summary
      response += `### Product Views\n`;
      response += `- **Total Events:** ${sessionReport.productViews.total}\n`;
      response += `- **Unique Products:** ${sessionReport.productViews.unique}\n\n`;

      // Cart summary
      response += `### Cart Summary\n`;
      response += `- **Cart Snapshots:** ${sessionReport.cartEvents.total}\n`;
      if (sessionReport.cartEvents.finalCart) {
        response += `- **Final Cart Items:** ${sessionReport.cartEvents.finalCart.itemCount}\n`;
        response += `- **Final Cart Total:** $${(sessionReport.cartEvents.finalCart.cartTotal / 100).toFixed(2)}\n`;
      }
      response += '\n';

      // Data quality
      const hasIssues =
        sessionReport.dataQuality.missingFields.length > 0 ||
        sessionReport.dataQuality.malformedUrls.length > 0 ||
        sessionReport.dataQuality.warnings.length > 0;

      response += `### Data Quality\n`;
      if (!hasIssues) {
        response += `✓ No issues detected\n\n`;
      } else {
        if (sessionReport.dataQuality.missingFields.length > 0) {
          response += `**Missing Fields:** ${sessionReport.dataQuality.missingFields.length}\n`;
        }
        if (sessionReport.dataQuality.malformedUrls.length > 0) {
          response += `**Malformed URLs:** ${sessionReport.dataQuality.malformedUrls.length}\n`;
        }
        if (sessionReport.dataQuality.warnings.length > 0) {
          response += `**Warnings:** ${sessionReport.dataQuality.warnings.length}\n`;
        }
        response += '\n';
      }

      // ========================================================================
      // Step 2: Store Registry Check
      // ========================================================================
      response += `---\n## 2. Store Registry Status\n\n`;

      const { storeId, domain } = sessionReport.storeMetadata;

      if (!storeId && !domain) {
        response += `⚠️ Could not determine store ID or domain from session data\n\n`;
      } else {
        const storeCheck = await StoreOnboardingManager.checkStoreExists(storeId, domain);
        const fixtureExists = domain ? await StoreOnboardingManager.fixtureExists(domain) : false;

        response += `| Check | Status |\n`;
        response += `|-------|--------|\n`;
        response += `| Store Config | ${storeCheck.exists ? '✓ Exists' : '✗ Not found'} |\n`;
        response += `| Test Fixture | ${fixtureExists ? '✓ Exists' : '✗ Not found'} |\n\n`;

        if (!storeCheck.exists && !fixtureExists) {
          response += `**Action Required:** Store needs onboarding to store-registry\n`;
          response += `- Use \`store_validate_metadata\` → \`store_generate_fixture\` → \`store_run_tests\`\n\n`;
        }
      }

      // ========================================================================
      // Step 3: ID Extraction Validation
      // ========================================================================
      response += `---\n## 3. ID Extraction Validation\n\n`;

      // Product URLs
      const productExtractions = productViews.map((pv) => ({
        name: pv.name,
        url: pv.url,
        extractedIds: CartEnricherManager.extractProductId(pv.url),
      }));

      const productUrlsWithIds = productExtractions.filter((p) => p.extractedIds.length > 0);
      const productExtractionRate =
        productExtractions.length > 0
          ? (productUrlsWithIds.length / productExtractions.length) * 100
          : 0;

      response += `### Product View URLs\n`;
      response += `- **Total:** ${productExtractions.length}\n`;
      response += `- **Successful Extractions:** ${productUrlsWithIds.length} (${productExtractionRate.toFixed(0)}%)\n\n`;

      // Cart URLs
      const finalCartEvent = cartEvents.length > 0 ? cartEvents[cartEvents.length - 1] : null;
      const cartItems = finalCartEvent ? finalCartEvent.product_list : [];

      const cartExtractions = cartItems.map((item) => ({
        name: item.name,
        url: item.url,
        extractedIds: item.url ? CartEnricherManager.extractProductId(item.url) : [],
        imageSkus: extractSkusFromImageUrl(item.image_url),
      }));

      const cartWithIds = cartExtractions.filter(
        (c) => c.extractedIds.length > 0 || c.imageSkus.length > 0,
      );

      response += `### Cart Item URLs\n`;
      response += `- **Total Items:** ${cartExtractions.length}\n`;
      response += `- **With Extractable IDs:** ${cartWithIds.length}\n\n`;

      // ID overlap
      const allProductIds = new Set<string>();
      for (const p of productExtractions) {
        for (const id of p.extractedIds) {
          allProductIds.add(id);
        }
      }

      const matchingCartItems = cartExtractions.filter(
        (c) =>
          c.extractedIds.some((id) => allProductIds.has(id)) ||
          c.imageSkus.some((sku) => allProductIds.has(sku)),
      );

      const idOverlapRate =
        cartExtractions.length > 0 ? (matchingCartItems.length / cartExtractions.length) * 100 : 0;

      response += `### ID Overlap (Cart → Product)\n`;
      response += `- **Cart items matching product IDs:** ${matchingCartItems.length}/${cartExtractions.length} (${idOverlapRate.toFixed(0)}%)\n\n`;

      // ========================================================================
      // Step 4: Match Predictions
      // ========================================================================
      response += `---\n## 4. Match Predictions\n\n`;

      const uniqueProducts = CartEnricherManager.identifyUniqueProducts(productViews);
      const predictions = cartItems.map((item) =>
        predictMatchForCartItem(item as RawCartProduct, uniqueProducts),
      );

      const highConfidence = predictions.filter((p) => p.confidence === 'high').length;
      const mediumConfidence = predictions.filter((p) => p.confidence === 'medium').length;
      const lowConfidence = predictions.filter((p) => p.confidence === 'low').length;
      const withViews = predictions.filter((p) => p.hasCorrespondingView).length;

      response += `### Confidence Distribution\n`;
      response += `| Confidence | Count | Percentage |\n`;
      response += `|------------|-------|------------|\n`;
      response += `| High | ${highConfidence} | ${predictions.length > 0 ? ((highConfidence / predictions.length) * 100).toFixed(0) : 0}% |\n`;
      response += `| Medium | ${mediumConfidence} | ${predictions.length > 0 ? ((mediumConfidence / predictions.length) * 100).toFixed(0) : 0}% |\n`;
      response += `| Low | ${lowConfidence} | ${predictions.length > 0 ? ((lowConfidence / predictions.length) * 100).toFixed(0) : 0}% |\n\n`;

      response += `### Items with Product Views: ${withViews}/${predictions.length}\n\n`;

      // Strategy breakdown
      const strategyCount: Record<string, number> = {};
      for (const p of predictions) {
        if (p.predictedStrategy) {
          strategyCount[p.predictedStrategy] = (strategyCount[p.predictedStrategy] ?? 0) + 1;
        }
      }

      if (Object.keys(strategyCount).length > 0) {
        response += `### Expected Matching Strategies\n`;
        response += `| Strategy | Count | Confidence |\n`;
        response += `|----------|-------|------------|\n`;
        for (const [strategy, count] of Object.entries(strategyCount).sort((a, b) => b[1] - a[1])) {
          const confidence = STRATEGY_CONFIDENCE[strategy as MatchingStrategy];
          response += `| ${strategy} | ${count} | ${confidence} |\n`;
        }
        response += '\n';
      }

      // Individual predictions
      response += `### Per-Item Predictions\n`;
      for (const prediction of predictions) {
        const icon =
          prediction.confidence === 'high' ? '✓' : prediction.confidence === 'medium' ? '◐' : '○';
        response += `- ${icon} **${prediction.cartItemName}**\n`;
        response += `  - Strategy: \`${prediction.predictedStrategy ?? 'none'}\` (${prediction.confidence})\n`;
        response += `  - ${prediction.rationale}\n`;
      }
      response += '\n';

      // ========================================================================
      // Step 5: Overall Assessment
      // ========================================================================
      response += `---\n## 5. Overall Assessment\n\n`;

      // Calculate overall score
      const scores = {
        dataQuality: hasIssues ? 70 : 100,
        idExtraction: productExtractionRate,
        idOverlap: idOverlapRate,
        matchConfidence:
          predictions.length > 0
            ? ((highConfidence * 100 + mediumConfidence * 70 + lowConfidence * 40) /
                predictions.length /
                100) *
              100
            : 0,
      };

      const overallScore =
        (scores.dataQuality * 0.1 +
          scores.idExtraction * 0.25 +
          scores.idOverlap * 0.25 +
          scores.matchConfidence * 0.4) |
        0;

      response += `### Quality Scores\n`;
      response += `| Metric | Score |\n`;
      response += `|--------|-------|\n`;
      response += `| Data Quality | ${scores.dataQuality.toFixed(0)}% |\n`;
      response += `| ID Extraction | ${scores.idExtraction.toFixed(0)}% |\n`;
      response += `| ID Overlap | ${scores.idOverlap.toFixed(0)}% |\n`;
      response += `| Match Confidence | ${scores.matchConfidence.toFixed(0)}% |\n`;
      response += `| **Overall** | **${overallScore}%** |\n\n`;

      // Assessment summary
      if (overallScore >= 80) {
        response += `### ✓ Ready for Fixture Creation\n`;
        response += `This session data has high-quality matching potential. Proceed with fixture creation.\n\n`;
      } else if (overallScore >= 60) {
        response += `### ◐ Moderate Quality\n`;
        response += `Some improvements may be needed for optimal matching:\n`;
        if (scores.idExtraction < 80) {
          response += `- Consider updating store-registry patterns for better ID extraction\n`;
        }
        if (scores.idOverlap < 80) {
          response += `- Some cart items may not match due to missing product views\n`;
        }
        if (scores.matchConfidence < 80) {
          response += `- Low-confidence matching strategies may need review\n`;
        }
        response += '\n';
      } else {
        response += `### ✗ Needs Improvement\n`;
        response += `Significant issues detected:\n`;
        if (scores.idExtraction < 50) {
          response += `- ID extraction is failing for many URLs - store-registry patterns need update\n`;
        }
        if (scores.idOverlap < 50) {
          response += `- Low overlap between cart IDs and product IDs\n`;
        }
        response += '\n';
      }

      // ========================================================================
      // Step 6: Generated Fixture (if requested)
      // ========================================================================
      if (state.generateFixture !== false) {
        response += `---\n## 6. Generated Fixture\n\n`;

        const storeSlug = (sessionReport.storeMetadata.storeName || 'unknown-store')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');
        const fixtureName = state.fixtureName || `${storeSlug}-session-001`;
        const description = `${uniqueProducts.length} unique product views and ${cartItems.length} cart items`;

        // Build expected matches
        const expectedMatches: Array<{
          cartItemName: string;
          productSku: string;
          confidence: 'high' | 'medium' | 'low';
          reason: string;
        }> = [];

        for (const prediction of predictions) {
          const cartItem = cartItems.find((c) => c.name === prediction.cartItemName);
          const matchingProduct = uniqueProducts.find((p) => {
            if (cartItem?.url) {
              const cartExtractedIds = CartEnricherManager.extractProductId(cartItem.url);
              if (cartExtractedIds.some((id) => p.extractedIds.includes(id))) {
                return true;
              }
            }
            return p.name.toLowerCase().includes(prediction.cartItemName.toLowerCase());
          });

          let productSku = 'UNKNOWN';
          if (matchingProduct) {
            if (matchingProduct.extractedIds.length > 0) {
              productSku = matchingProduct.extractedIds[0]!;
            } else if (matchingProduct.skus.length > 0) {
              productSku = matchingProduct.skus[0]!;
            }
          }

          expectedMatches.push({
            cartItemName: prediction.cartItemName,
            productSku,
            confidence: prediction.confidence,
            reason: prediction.rationale,
          });
        }

        const fixtureCode = generateFixtureCode({
          fixtureName,
          description,
          storeId: sessionReport.storeMetadata.storeId,
          storeName: sessionReport.storeMetadata.storeName,
          expectedMatches,
          productViews,
          cartEvents,
          uniqueProducts,
        });

        response += `**Fixture Name:** ${fixtureName}\n`;
        response += `**File Path:** \`packages/cart-enricher/src/__fixtures__/${fixtureName}.ts\`\n\n`;

        response += `### Expected Matches Summary\n`;
        for (const match of expectedMatches) {
          const icon =
            match.confidence === 'high' ? '✓' : match.confidence === 'medium' ? '◐' : '○';
          response += `- ${icon} ${match.cartItemName} → \`${match.productSku}\`\n`;
        }
        response += '\n';

        response += `### Fixture Code\n\n`;
        response += '```typescript\n';
        response += fixtureCode;
        response += '\n```\n\n';
      }

      // ========================================================================
      // Next Steps
      // ========================================================================
      response += `---\n## Next Steps\n\n`;
      response += `1. Review the generated fixture code above\n`;
      response += `2. Save to \`packages/cart-enricher/src/__fixtures__/\`\n`;
      response += `3. Update \`packages/cart-enricher/src/__fixtures__/index.ts\` to export\n`;
      response += `4. Run \`pnpm --filter @rr/cart-enricher test\` to validate\n`;

      if (overallScore < 80) {
        response += `5. Consider running individual analysis tools for deeper investigation:\n`;
        response += `   - \`cart_check_store_registry\` for store config details\n`;
        response += `   - \`cart_validate_id_extraction\` for URL pattern analysis\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createReviewMatchingLogicTool(server: McpServer) {
  return server.tool(
    'cart_review_matching_logic',
    'Review cart-enricher matching strategies against session data and identify gaps or improvement opportunities',
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

      const productViews = state.productViews as RawProductViewEvent[];
      const cartEvents = state.cartEvents as RawCartEvent[];

      // Get unique products and cart items
      const uniqueProducts = CartEnricherManager.identifyUniqueProducts(productViews);
      const finalCartEvent = cartEvents.length > 0 ? cartEvents[cartEvents.length - 1] : null;
      const cartItems = finalCartEvent ? finalCartEvent.product_list : [];

      let response = `## Matching Logic Review\n\n`;
      response += `Analyzing how cart-enricher's 9 matching strategies apply to this session data.\n\n`;

      // ========================================================================
      // Strategy 1: SKU Match (high confidence)
      // ========================================================================
      response += `---\n### Strategy 1: SKU Match (high confidence)\n`;
      response += `**Logic:** cart.ids.skus ∩ product.ids.skus\n\n`;

      const productsWithSkus = uniqueProducts.filter((p) => p.skus.length > 0);

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Products with SKUs | ${productsWithSkus.length}/${uniqueProducts.length} |\n`;
      response += `| Cart items with SKUs | Requires normalization |\n`;

      if (productsWithSkus.length > 0) {
        response += `\n**Product SKU samples:**\n`;
        for (const p of productsWithSkus.slice(0, 3)) {
          response += `- ${p.name}: ${p.skus.slice(0, 3).join(', ')}${p.skus.length > 3 ? '...' : ''}\n`;
        }
      }

      if (productsWithSkus.length === 0) {
        response += `\n⚠️ **Gap:** No SKUs in product data - SKU matching unavailable\n`;
      }
      response += '\n';

      // ========================================================================
      // Strategy 2: Variant SKU Match (high confidence)
      // ========================================================================
      response += `---\n### Strategy 2: Variant SKU Match (high confidence)\n`;
      response += `**Logic:** cart.ids.skus ∩ product.variants[].sku\n\n`;
      response += `This strategy requires normalized products with variant data.\n`;
      response += `Raw product views contain sku_list which would become variants after normalization.\n`;

      const avgSkusPerProduct =
        productsWithSkus.length > 0
          ? productsWithSkus.reduce((sum, p) => sum + p.skus.length, 0) / productsWithSkus.length
          : 0;
      response += `- Average SKUs per product: ${avgSkusPerProduct.toFixed(1)}\n`;
      response += '\n';

      // ========================================================================
      // Strategy 3: Image SKU Match (high confidence)
      // ========================================================================
      response += `---\n### Strategy 3: Image SKU Match (high confidence)\n`;
      response += `**Logic:** SKU extracted from cart.imageUrl ∩ product.ids.skus\n\n`;

      const cartItemsWithImages = cartItems.filter((c) => c.image_url);
      const imageSkuResults = cartItems.map((c) => ({
        name: c.name,
        imageUrl: c.image_url,
        extractedSkus: extractSkusFromImageUrl(c.image_url),
      }));
      const itemsWithImageSkus = imageSkuResults.filter((r) => r.extractedSkus.length > 0);

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Cart items with images | ${cartItemsWithImages.length}/${cartItems.length} |\n`;
      response += `| Items with extractable image SKUs | ${itemsWithImageSkus.length}/${cartItems.length} |\n`;

      if (itemsWithImageSkus.length > 0) {
        response += `\n**Extracted image SKUs:**\n`;
        for (const r of itemsWithImageSkus) {
          response += `- ${r.name}: ${r.extractedSkus.join(', ')}\n`;
        }
      }

      if (cartItemsWithImages.length > 0 && itemsWithImageSkus.length === 0) {
        response += `\n⚠️ **Gap:** Cart images exist but no SKUs extracted - image URL pattern may not match\n`;
        response += `Current pattern: \`/([A-Z][A-Z0-9]{3,9})(?=[-_.])/g\`\n`;
      }
      response += '\n';

      // ========================================================================
      // Strategy 4: Extracted ID → SKU Match (high confidence)
      // ========================================================================
      response += `---\n### Strategy 4: Extracted ID → SKU Match (high confidence)\n`;
      response += `**Logic:** cart.ids.extractedIds ∩ product.ids.skus\n\n`;

      const cartExtractedIds = cartItems
        .filter((c) => c.url)
        .map((c) => ({
          name: c.name,
          url: c.url!,
          extractedIds: CartEnricherManager.extractProductId(c.url!),
        }));

      const cartIdsMatchingProductSkus = cartExtractedIds.filter((c) =>
        c.extractedIds.some((id) => productsWithSkus.some((p) => p.skus.includes(id))),
      );

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Cart items with extractable IDs | ${cartExtractedIds.filter((c) => c.extractedIds.length > 0).length}/${cartItems.length} |\n`;
      response += `| Cart IDs matching product SKUs | ${cartIdsMatchingProductSkus.length} |\n`;

      if (cartIdsMatchingProductSkus.length > 0) {
        response += `\n✓ **Working:** Some cart extracted IDs match product SKUs\n`;
      } else if (cartExtractedIds.filter((c) => c.extractedIds.length > 0).length > 0) {
        response += `\n⚠️ **Gap:** Cart URLs yield IDs but don't match product SKUs\n`;
        response += `This may indicate different ID systems (product ID vs UPC/SKU)\n`;
      }
      response += '\n';

      // ========================================================================
      // Strategy 5: URL Match (medium confidence)
      // ========================================================================
      response += `---\n### Strategy 5: URL Match (medium confidence)\n`;
      response += `**Logic:** Normalized URL comparison\n\n`;

      const cartItemsWithUrls = cartItems.filter((c) => c.url);
      const urlMatches = cartItems.filter((c) => {
        if (!c.url) return false;
        const cartUrl = c.url.toLowerCase().replace(/\/+$/, '');
        return uniqueProducts.some((p) => p.url.toLowerCase().replace(/\/+$/, '') === cartUrl);
      });

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Cart items with URLs | ${cartItemsWithUrls.length}/${cartItems.length} |\n`;
      response += `| Exact URL matches | ${urlMatches.length}/${cartItems.length} |\n`;

      if (cartItemsWithUrls.length > 0 && urlMatches.length === 0) {
        response += `\n**Sample URL comparison:**\n`;
        const sample = cartItemsWithUrls[0];
        const productSample = uniqueProducts[0];
        if (sample && productSample) {
          response += `- Cart: \`${sample.url}\`\n`;
          response += `- Product: \`${productSample.url}\`\n`;

          // Analyze differences
          const cartUrl = sample.url || '';
          const productUrl = productSample.url;
          if (cartUrl.startsWith('http') && !productUrl.startsWith('http')) {
            response += `- ⚠️ Cart URLs are absolute, product URLs are relative\n`;
          }
          if (!cartUrl.startsWith('http') && productUrl.startsWith('http')) {
            response += `- ⚠️ Cart URLs are relative, product URLs are absolute\n`;
          }
        }
      }
      response += '\n';

      // ========================================================================
      // Strategy 6: Extracted ID Match (medium confidence)
      // ========================================================================
      response += `---\n### Strategy 6: Extracted ID Match (medium confidence)\n`;
      response += `**Logic:** cart.ids.extractedIds ∩ product.ids.extractedIds\n\n`;

      const idMatches = cartExtractedIds.filter((c) =>
        c.extractedIds.some((id) => uniqueProducts.some((p) => p.extractedIds.includes(id))),
      );

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Cart items with extracted IDs | ${cartExtractedIds.filter((c) => c.extractedIds.length > 0).length}/${cartItems.length} |\n`;
      response += `| Products with extracted IDs | ${uniqueProducts.filter((p) => p.extractedIds.length > 0).length}/${uniqueProducts.length} |\n`;
      response += `| ID matches | ${idMatches.length}/${cartItems.length} |\n`;

      if (idMatches.length > 0) {
        response += `\n✓ **Working:** Extracted ID matching is effective\n`;
      }
      response += '\n';

      // ========================================================================
      // Strategy 7: Title + Color Match (medium confidence)
      // ========================================================================
      response += `---\n### Strategy 7: Title + Color Match (medium confidence)\n`;
      response += `**Logic:** Parse "Title - Color" from cart, match product title + color field\n\n`;

      const parsedCartTitles = cartItems.map((c) => ({
        original: c.name,
        ...parseCartTitle(c.name),
      }));

      const titlesWithColor = parsedCartTitles.filter((t) => t.color !== null);
      const productsWithColors = uniqueProducts.filter((p) => p.colors.length > 0);

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Cart titles with color suffix | ${titlesWithColor.length}/${cartItems.length} |\n`;
      response += `| Products with color data | ${productsWithColors.length}/${uniqueProducts.length} |\n`;

      if (titlesWithColor.length > 0) {
        response += `\n**Parsed cart titles:**\n`;
        for (const t of titlesWithColor.slice(0, 3)) {
          response += `- "${t.original}" → Base: "${t.base}", Color: "${t.color}"\n`;
        }
      }

      if (titlesWithColor.length === 0 && productsWithColors.length > 0) {
        response += `\n📝 **Note:** Products have colors but cart titles don't include color suffix\n`;
        response += `This strategy won't be applicable for this store\n`;
      }
      response += '\n';

      // ========================================================================
      // Strategy 8: Title Similarity (low confidence)
      // ========================================================================
      response += `---\n### Strategy 8: Title Similarity (low confidence)\n`;
      response += `**Logic:** Fuzzy title matching using Dice coefficient + Levenshtein\n\n`;

      // Calculate similarity for each cart item
      const titleSimilarities = cartItems.map((c) => {
        let bestMatch = { product: '', similarity: 0 };
        for (const p of uniqueProducts) {
          const cartTitle = c.name.toLowerCase().trim();
          const productTitle = p.name.toLowerCase().trim();

          // Simple containment check
          let similarity = 0;
          if (cartTitle === productTitle) {
            similarity = 1;
          } else if (cartTitle.includes(productTitle) || productTitle.includes(cartTitle)) {
            similarity = 0.9;
          } else {
            // Token overlap
            const cartTokens = new Set(cartTitle.split(/\s+/));
            const productTokens = new Set(productTitle.split(/\s+/));
            let overlap = 0;
            for (const t of cartTokens) {
              if (productTokens.has(t)) overlap++;
            }
            similarity = (2 * overlap) / (cartTokens.size + productTokens.size);
          }

          if (similarity > bestMatch.similarity) {
            bestMatch = { product: p.name, similarity };
          }
        }
        return { cartTitle: c.name, ...bestMatch };
      });

      const highSimilarity = titleSimilarities.filter((t) => t.similarity >= 0.8);
      const mediumSimilarity = titleSimilarities.filter(
        (t) => t.similarity >= 0.6 && t.similarity < 0.8,
      );
      const lowSimilarity = titleSimilarities.filter((t) => t.similarity < 0.6);

      response += `| Similarity Range | Count |\n`;
      response += `|------------------|-------|\n`;
      response += `| ≥80% (will match) | ${highSimilarity.length} |\n`;
      response += `| 60-80% (borderline) | ${mediumSimilarity.length} |\n`;
      response += `| <60% (won't match) | ${lowSimilarity.length} |\n`;

      if (lowSimilarity.length > 0) {
        response += `\n**Low similarity items (may not match):**\n`;
        for (const t of lowSimilarity.slice(0, 3)) {
          response += `- "${t.cartTitle}" → Best: "${t.product}" (${(t.similarity * 100).toFixed(0)}%)\n`;
        }
      }
      response += '\n';

      // ========================================================================
      // Strategy 9: Price Match (low confidence, supporting only)
      // ========================================================================
      response += `---\n### Strategy 9: Price Match (low, supporting only)\n`;
      response += `**Logic:** Price within 10% tolerance (tax, discounts)\n\n`;

      const cartPrices = cartItems.map((c) => ({
        name: c.name,
        price: c.item_price,
        priceDollars: c.item_price / 100,
      }));

      const productPrices = uniqueProducts.map((p) => ({
        name: p.name,
        priceRange: p.priceRange,
      }));

      // Check for price format consistency
      const cartPriceFormat =
        cartPrices.length > 0 && cartPrices[0]!.price > 1000 ? 'cents' : 'dollars';
      const productPriceFormat =
        productPrices.length > 0 && productPrices[0]!.priceRange.min < 1000 ? 'dollars' : 'cents';

      response += `| Check | Result |\n`;
      response += `|-------|--------|\n`;
      response += `| Cart price format | ${cartPriceFormat} |\n`;
      response += `| Product price format | ${productPriceFormat} |\n`;

      if (cartPriceFormat !== productPriceFormat) {
        response += `\n📝 **Note:** Price formats differ - normalization handles conversion\n`;
      }
      response += '\n';

      // ========================================================================
      // Summary & Recommendations
      // ========================================================================
      response += `---\n## Summary\n\n`;

      const strategies = [
        {
          name: 'SKU',
          works: productsWithSkus.length > 0,
          confidence: 'high',
        },
        {
          name: 'Image SKU',
          works: itemsWithImageSkus.length > 0,
          confidence: 'high',
        },
        {
          name: 'Extracted ID → SKU',
          works: cartIdsMatchingProductSkus.length > 0,
          confidence: 'high',
        },
        { name: 'URL', works: urlMatches.length > 0, confidence: 'medium' },
        { name: 'Extracted ID', works: idMatches.length > 0, confidence: 'medium' },
        {
          name: 'Title + Color',
          works: titlesWithColor.length > 0 && productsWithColors.length > 0,
          confidence: 'medium',
        },
        { name: 'Title Similarity', works: highSimilarity.length > 0, confidence: 'low' },
      ];

      const workingStrategies = strategies.filter((s) => s.works);
      const gapStrategies = strategies.filter((s) => !s.works);

      response += `### Working Strategies (${workingStrategies.length}/7)\n`;
      for (const s of workingStrategies) {
        response += `- ✓ ${s.name} (${s.confidence})\n`;
      }
      response += '\n';

      response += `### Gap Strategies (${gapStrategies.length}/7)\n`;
      for (const s of gapStrategies) {
        response += `- ✗ ${s.name} (${s.confidence})\n`;
      }
      response += '\n';

      // Recommendations
      response += `### Recommendations\n`;

      if (idMatches.length === cartItems.length) {
        response += `✓ All cart items match via extracted_id - strong matching scenario\n`;
      } else if (idMatches.length > 0) {
        response += `◐ Partial extracted_id coverage - ${idMatches.length}/${cartItems.length} items\n`;
      }

      if (gapStrategies.some((s) => s.name === 'SKU')) {
        response += `- Consider if product data should include SKU lists\n`;
      }

      if (gapStrategies.some((s) => s.name === 'Image SKU') && cartItemsWithImages.length > 0) {
        response += `- Review image URL patterns for extractable SKUs\n`;
      }

      if (lowSimilarity.length > 0) {
        response += `- ${lowSimilarity.length} item(s) have low title similarity - may need manual review\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createSuggestImprovementsTool(server: McpServer) {
  return server.tool(
    'cart_suggest_improvements',
    'Recommend matching logic improvements based on data patterns, including new strategies, confidence adjustments, and implementation guidance',
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

      const productViews = state.productViews as RawProductViewEvent[];
      const cartEvents = state.cartEvents as RawCartEvent[];

      // Get unique products and cart items
      const uniqueProducts = CartEnricherManager.identifyUniqueProducts(productViews);
      const finalCartEvent = cartEvents.length > 0 ? cartEvents[cartEvents.length - 1] : null;
      const cartItems = finalCartEvent ? finalCartEvent.product_list : [];

      let response = `## Improvement Suggestions\n\n`;
      response += `Based on analysis of ${uniqueProducts.length} products and ${cartItems.length} cart items.\n\n`;

      const suggestions: Array<{
        category: string;
        title: string;
        description: string;
        implementation: string;
        impact: string;
        priority: 'high' | 'medium' | 'low';
      }> = [];

      // ========================================================================
      // Analyze patterns for suggestions
      // ========================================================================

      // 1. Check for new ID patterns in URLs
      const allUrls = [
        ...productViews.map((p) => p.url),
        ...cartItems.filter((c) => c.url).map((c) => c.url!),
      ];

      const urlPatterns = analyzeUrlPatterns(allUrls);

      if (urlPatterns.queryParams.length > 0) {
        const unusedParams = urlPatterns.queryParams.filter(
          (p) => !['id', 'productid', 'sku', 'pid', 'product_id'].includes(p.toLowerCase()),
        );
        if (unusedParams.length > 0) {
          suggestions.push({
            category: 'ID Extraction',
            title: 'Potential new query parameters for ID extraction',
            description: `Found query parameters that may contain product IDs: ${unusedParams.slice(0, 5).join(', ')}`,
            implementation: `Add pattern to store-registry config:\n\`\`\`typescript\nsearchPatterns: [buildRegex(namedCapture(oneOrMore(digit), 'id'), { searchParams: ['${unusedParams[0]}'] })]\n\`\`\``,
            impact: `Could improve ID extraction for ${urlPatterns.urlsWithParams} URLs`,
            priority: 'medium',
          });
        }
      }

      // 2. Check for SKU patterns in image URLs
      const imageUrls = cartItems.filter((c) => c.image_url).map((c) => c.image_url!);
      const imageSkuPatterns = analyzeImageSkuPatterns(imageUrls);

      if (imageSkuPatterns.potentialPatterns.length > 0) {
        suggestions.push({
          category: 'Image SKU Extraction',
          title: 'New image URL SKU patterns detected',
          description: `Found potential SKU patterns in image URLs: ${imageSkuPatterns.potentialPatterns.join(', ')}`,
          implementation: `Update extractSkusFromImageUrl() in enricher.ts to handle pattern:\n\`\`\`typescript\n// Add new pattern for ${imageSkuPatterns.potentialPatterns[0]}\nconst newPattern = /${imageSkuPatterns.suggestedRegex}/g;\n\`\`\``,
          impact: `Could enable image_sku matching for ${imageSkuPatterns.matchingUrls} cart items`,
          priority: imageSkuPatterns.matchingUrls > 0 ? 'high' : 'low',
        });
      }

      // 3. Check for title normalization improvements
      const titleAnalysis = analyzeTitlePatterns(
        cartItems.map((c) => c.name),
        uniqueProducts.map((p) => p.name),
      );

      if (titleAnalysis.commonPrefixes.length > 0) {
        suggestions.push({
          category: 'Title Matching',
          title: 'Brand prefix normalization opportunity',
          description: `Cart titles have brand prefixes that product titles don't: ${titleAnalysis.commonPrefixes.slice(0, 3).join(', ')}`,
          implementation: `Add brand prefix stripping to title normalization:\n\`\`\`typescript\nfunction normalizeTitle(title: string): string {\n  // Strip common brand prefixes\n  const prefixes = [${titleAnalysis.commonPrefixes.map((p) => `'${p}'`).join(', ')}];\n  for (const prefix of prefixes) {\n    if (title.startsWith(prefix)) {\n      return title.slice(prefix.length).trim();\n    }\n  }\n  return title;\n}\n\`\`\``,
          impact: `Could improve title matching for ${titleAnalysis.affectedItems} items`,
          priority: titleAnalysis.affectedItems > 1 ? 'medium' : 'low',
        });
      }

      if (titleAnalysis.commonSuffixes.length > 0) {
        suggestions.push({
          category: 'Title Matching',
          title: 'Size/variant suffix normalization',
          description: `Titles have size/variant suffixes that could be stripped: ${titleAnalysis.commonSuffixes.slice(0, 3).join(', ')}`,
          implementation: `Strip variant suffixes before comparison:\n\`\`\`typescript\n// Remove size/variant suffixes like "- S", "- Medium", etc.\nconst suffixPattern = /\\s*[-–]\\s*(XS|S|M|L|XL|XXL|\\d+)$/i;\ntitle = title.replace(suffixPattern, '');\n\`\`\``,
          impact: 'Could improve title similarity scores',
          priority: 'low',
        });
      }

      // 4. Check for price format issues
      const priceAnalysis = analyzePricePatterns(
        cartItems.map((c) => c.item_price),
        uniqueProducts.map((p) => p.priceRange),
      );

      if (priceAnalysis.formatMismatch) {
        suggestions.push({
          category: 'Price Matching',
          title: 'Price format normalization needed',
          description: `Cart prices appear to be in ${priceAnalysis.cartFormat}, products in ${priceAnalysis.productFormat}`,
          implementation: `Ensure consistent price normalization in both normalizers:\n\`\`\`typescript\n// Convert all prices to cents for comparison\nconst priceInCents = priceFormat === 'dollars' ? Math.round(price * 100) : price;\n\`\`\``,
          impact: 'Ensures accurate price matching',
          priority: 'medium',
        });
      }

      // 5. Check for color matching improvements
      const productsWithColors = uniqueProducts.filter((p) => p.colors.length > 0);
      const colorAnalysis = analyzeColorPatterns(cartItems, productsWithColors);

      if (colorAnalysis.unmatchedColors.length > 0) {
        suggestions.push({
          category: 'Title + Color Matching',
          title: 'Color synonym mapping opportunity',
          description: `Found color variations that may not match: ${colorAnalysis.unmatchedColors.slice(0, 5).join(', ')}`,
          implementation: `Add color synonym mapping:\n\`\`\`typescript\nconst COLOR_SYNONYMS: Record<string, string[]> = {\n  'black': ['noir', 'onyx', 'jet'],\n  'white': ['ivory', 'cream', 'snow'],\n  'gray': ['grey', 'charcoal', 'slate'],\n  // Add store-specific mappings\n};\n\`\`\``,
          impact: `Could improve matching for ${colorAnalysis.unmatchedColors.length} items`,
          priority: colorAnalysis.unmatchedColors.length > 2 ? 'medium' : 'low',
        });
      }

      // 6. General confidence tuning suggestions
      const confidenceAnalysis = analyzeConfidenceTuning(uniqueProducts, cartItems);

      if (confidenceAnalysis.extractedIdReliability > 0.9) {
        suggestions.push({
          category: 'Confidence Tuning',
          title: 'Consider upgrading extracted_id to high confidence',
          description: `Extracted ID matching shows ${(confidenceAnalysis.extractedIdReliability * 100).toFixed(0)}% reliability for this store`,
          implementation: `For stores with reliable ID extraction, consider:\n\`\`\`typescript\n// In matchCartItem, for specific stores with reliable ID extraction\nif (storeHasReliableIdExtraction(storeId)) {\n  extractedIdMatch.confidence = 'high';\n}\n\`\`\``,
          impact: 'Higher confidence scores for well-matched items',
          priority: 'low',
        });
      }

      // ========================================================================
      // Generate response
      // ========================================================================

      if (suggestions.length === 0) {
        response += `### No Improvements Needed\n\n`;
        response += `Current matching strategies appear well-suited for this store's data patterns.\n`;
        response += `All standard strategies should work effectively.\n`;
      } else {
        // Group by priority
        const highPriority = suggestions.filter((s) => s.priority === 'high');
        const mediumPriority = suggestions.filter((s) => s.priority === 'medium');
        const lowPriority = suggestions.filter((s) => s.priority === 'low');

        response += `### Summary\n`;
        response += `Found ${suggestions.length} potential improvement(s):\n`;
        response += `- High priority: ${highPriority.length}\n`;
        response += `- Medium priority: ${mediumPriority.length}\n`;
        response += `- Low priority: ${lowPriority.length}\n\n`;

        // Output suggestions by priority
        const outputSuggestions = (
          items: typeof suggestions,
          priorityLabel: string,
          icon: string,
        ) => {
          if (items.length === 0) return;
          response += `---\n### ${icon} ${priorityLabel} Priority\n\n`;
          for (const s of items) {
            response += `#### ${s.title}\n`;
            response += `**Category:** ${s.category}\n\n`;
            response += `${s.description}\n\n`;
            response += `**Implementation:**\n${s.implementation}\n\n`;
            response += `**Expected Impact:** ${s.impact}\n\n`;
          }
        };

        outputSuggestions(highPriority, 'High', '🔴');
        outputSuggestions(mediumPriority, 'Medium', '🟡');
        outputSuggestions(lowPriority, 'Low', '🟢');
      }

      // Add cross-store pattern analysis
      response += `---\n### Cross-Store Pattern Notes\n\n`;
      response += `When implementing improvements, consider:\n`;
      response += `1. Test changes against existing fixtures to prevent regression\n`;
      response += `2. Generic patterns benefit multiple stores vs store-specific logic\n`;
      response += `3. Higher confidence strategies should be preferred over lower ones\n`;
      response += `4. Document any store-specific handling with comments\n`;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

// ============================================================================
// Helper functions for improvement suggestions
// ============================================================================

function analyzeUrlPatterns(urls: string[]): {
  queryParams: string[];
  urlsWithParams: number;
  pathPatterns: string[];
} {
  const paramCounts = new Map<string, number>();
  let urlsWithParams = 0;

  for (const url of urls) {
    try {
      const parsed = new URL(url, 'https://example.com');
      if (parsed.search) {
        urlsWithParams++;
        for (const key of parsed.searchParams.keys()) {
          paramCounts.set(key, (paramCounts.get(key) ?? 0) + 1);
        }
      }
    } catch {
      // Skip malformed URLs
    }
  }

  // Sort by frequency
  const queryParams = [...paramCounts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);

  return { queryParams, urlsWithParams, pathPatterns: [] };
}

function analyzeImageSkuPatterns(imageUrls: string[]): {
  potentialPatterns: string[];
  suggestedRegex: string;
  matchingUrls: number;
} {
  const patterns: string[] = [];
  let matchingUrls = 0;

  for (const url of imageUrls) {
    const filename = url.split('/').pop() ?? '';

    // Look for patterns not caught by current regex
    // Current: /([A-Z][A-Z0-9]{3,9})(?=[-_.])/g

    // Check for numeric IDs
    const numericMatch = filename.match(/(\d{6,12})/);
    if (numericMatch) {
      patterns.push(`numeric-${numericMatch[1]?.slice(0, 4)}...`);
      matchingUrls++;
    }

    // Check for mixed case patterns
    const mixedMatch = filename.match(/([a-zA-Z0-9]{8,})/);
    if (mixedMatch && !mixedMatch[1]?.match(/^[A-Z]/)) {
      patterns.push(`mixed-${mixedMatch[1]?.slice(0, 6)}...`);
    }
  }

  return {
    potentialPatterns: [...new Set(patterns)].slice(0, 3),
    suggestedRegex: '(\\d{6,12})',
    matchingUrls,
  };
}

function analyzeTitlePatterns(
  cartTitles: string[],
  productTitles: string[],
): {
  commonPrefixes: string[];
  commonSuffixes: string[];
  affectedItems: number;
} {
  const prefixes: string[] = [];
  const suffixes: string[] = [];
  let affectedItems = 0;

  for (const cartTitle of cartTitles) {
    // Check for brand prefixes not in product titles
    const words = cartTitle.split(/\s+/);
    if (words.length >= 2) {
      const potentialBrand = words[0];
      const hasMatchWithoutBrand = productTitles.some(
        (pt) =>
          !pt.toLowerCase().startsWith(potentialBrand!.toLowerCase()) &&
          pt.toLowerCase().includes(words.slice(1).join(' ').toLowerCase()),
      );
      if (hasMatchWithoutBrand && potentialBrand) {
        prefixes.push(potentialBrand);
        affectedItems++;
      }
    }

    // Check for size/variant suffixes
    const suffixMatch = cartTitle.match(/\s*[-–]\s*([A-Z]{1,3}|Small|Medium|Large|\d+)$/i);
    if (suffixMatch?.[1]) {
      suffixes.push(suffixMatch[1]);
    }
  }

  return {
    commonPrefixes: [...new Set(prefixes)],
    commonSuffixes: [...new Set(suffixes)],
    affectedItems,
  };
}

function analyzePricePatterns(
  cartPrices: number[],
  productPrices: Array<{ min: number; max: number }>,
): {
  formatMismatch: boolean;
  cartFormat: string;
  productFormat: string;
} {
  const avgCartPrice =
    cartPrices.length > 0 ? cartPrices.reduce((a, b) => a + b, 0) / cartPrices.length : 0;
  const avgProductPrice =
    productPrices.length > 0
      ? productPrices.reduce((a, b) => a + b.min, 0) / productPrices.length
      : 0;

  const cartFormat = avgCartPrice > 1000 ? 'cents' : 'dollars';
  const productFormat = avgProductPrice < 1000 ? 'dollars' : 'cents';

  return {
    formatMismatch: cartFormat !== productFormat,
    cartFormat,
    productFormat,
  };
}

function analyzeColorPatterns(
  cartItems: RawCartProduct[],
  productsWithColors: UniqueProduct[],
): {
  unmatchedColors: string[];
} {
  const cartColors: string[] = [];
  const productColors = new Set<string>();

  // Extract colors from cart item titles
  for (const item of cartItems) {
    const { color } = parseCartTitle(item.name);
    if (color) {
      cartColors.push(color.toLowerCase());
    }
  }

  // Collect all product colors
  for (const p of productsWithColors) {
    for (const c of p.colors) {
      productColors.add(c.toLowerCase());
    }
  }

  // Find cart colors not in products
  const unmatchedColors = cartColors.filter((c) => !productColors.has(c));

  return { unmatchedColors: [...new Set(unmatchedColors)] };
}

function analyzeConfidenceTuning(
  products: UniqueProduct[],
  cartItems: RawCartProduct[],
): {
  extractedIdReliability: number;
} {
  // Check how reliably extracted IDs match
  let matches = 0;
  let attempts = 0;

  const productIds = new Set(products.flatMap((p) => p.extractedIds));

  for (const item of cartItems) {
    if (item.url) {
      attempts++;
      const ids = CartEnricherManager.extractProductId(item.url);
      if (ids.some((id) => productIds.has(id))) {
        matches++;
      }
    }
  }

  return {
    extractedIdReliability: attempts > 0 ? matches / attempts : 0,
  };
}

function createAppendStoreUrlsTool(server: McpServer) {
  return server.tool(
    'cart_append_store_urls',
    'Add new URL test cases from session data to existing store-registry fixtures',
    {
      state: z.object({
        productViews: z
          .array(RawProductViewEventSchema)
          .describe('Array of raw product view events'),
        cartEvents: z.array(RawCartEventSchema).describe('Array of raw cart events'),
        dryRun: z
          .boolean()
          .default(true)
          .describe('If true, only analyze URLs without modifying fixtures (default: true)'),
      }),
    },
    async ({ state }) => {
      if (state.productViews.length === 0 && state.cartEvents.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No session data provided.' }],
        };
      }

      const productViews = state.productViews as RawProductViewEvent[];
      const cartEvents = state.cartEvents as RawCartEvent[];

      // Extract store metadata
      const storeMetadata = CartEnricherManager.extractStoreMetadata(productViews, cartEvents);

      let response = `## Append Store URLs Analysis\n\n`;
      response += `**Store:** ${storeMetadata.storeName} (ID: ${storeMetadata.storeId})\n`;
      response += `**Domain:** ${storeMetadata.domain}\n`;
      response += `**Mode:** ${state.dryRun ? 'Dry Run (analysis only)' : 'Live (will modify fixtures)'}\n\n`;

      // Collect all URLs from session
      const allUrls = new Set<string>();

      // Product view URLs
      for (const pv of productViews) {
        if (pv.url) allUrls.add(pv.url);
      }

      // Cart item URLs
      const finalCartEvent = cartEvents.length > 0 ? cartEvents[cartEvents.length - 1] : null;
      if (finalCartEvent) {
        for (const item of finalCartEvent.product_list) {
          if (item.url) allUrls.add(item.url);
        }
      }

      response += `---\n### URL Collection\n\n`;
      response += `**Total unique URLs:** ${allUrls.size}\n\n`;

      if (allUrls.size === 0) {
        response += `No URLs found in session data.\n`;
        return { content: [{ type: 'text', text: response }] };
      }

      // Filter to product pages only using store onboarding filter
      const urlArray = [...allUrls];
      const filterResult = StoreOnboardingManager.filterUrls(urlArray, storeMetadata.domain);

      response += `### URL Filtering\n\n`;
      response += `| Category | Count |\n`;
      response += `|----------|-------|\n`;
      response += `| Product URLs | ${filterResult.productUrls.length} |\n`;
      response += `| Filtered Out | ${filterResult.filteredUrls.length} |\n\n`;

      if (filterResult.filteredUrls.length > 0) {
        response += `**Filtered out (non-product pages):**\n`;
        for (const filtered of filterResult.filteredUrls.slice(0, 5)) {
          response += `- ${filtered.url} (${filtered.reason})\n`;
        }
        if (filterResult.filteredUrls.length > 5) {
          response += `- ... and ${filterResult.filteredUrls.length - 5} more\n`;
        }
        response += '\n';
      }

      if (filterResult.productUrls.length === 0) {
        response += `No product URLs to process after filtering.\n`;
        return { content: [{ type: 'text', text: response }] };
      }

      // Check if fixture exists for this store
      const fixtureExists = await StoreOnboardingManager.fixtureExists(storeMetadata.domain);

      response += `---\n### Store Registry Status\n\n`;
      response += `**Fixture exists:** ${fixtureExists ? '✓ Yes' : '✗ No'}\n\n`;

      // Validate ID extraction for each URL
      response += `---\n### ID Extraction Validation\n\n`;

      const extractionResults = filterResult.productUrls.map((url) => ({
        url,
        ids: CartEnricherManager.extractProductId(url),
      }));

      const successfulExtractions = extractionResults.filter((r) => r.ids.length > 0);
      const failedExtractions = extractionResults.filter((r) => r.ids.length === 0);

      response += `| Status | Count | Percentage |\n`;
      response += `|--------|-------|------------|\n`;
      response += `| Successful | ${successfulExtractions.length} | ${((successfulExtractions.length / extractionResults.length) * 100).toFixed(0)}% |\n`;
      response += `| Failed | ${failedExtractions.length} | ${((failedExtractions.length / extractionResults.length) * 100).toFixed(0)}% |\n\n`;

      if (successfulExtractions.length > 0) {
        response += `**Sample successful extractions:**\n`;
        for (const r of successfulExtractions.slice(0, 3)) {
          response += `- \`${r.ids.join(', ')}\` ← ${r.url.slice(0, 60)}...\n`;
        }
        response += '\n';
      }

      if (failedExtractions.length > 0) {
        response += `**Failed extractions (need pattern update):**\n`;
        for (const r of failedExtractions.slice(0, 5)) {
          response += `- ⚠️ ${r.url}\n`;
        }
        if (failedExtractions.length > 5) {
          response += `- ... and ${failedExtractions.length - 5} more\n`;
        }
        response += '\n';
      }

      // Determine action
      response += `---\n### Recommendations\n\n`;

      if (!fixtureExists) {
        response += `**Store not yet onboarded.** Use store onboarding MCP tools first:\n`;
        response += `1. \`store_validate_metadata\` with storeId: "${storeMetadata.storeId}", domain: "${storeMetadata.domain}"\n`;
        response += `2. \`store_generate_fixture\` with the product URLs\n`;
        response += `3. \`store_run_tests\` to verify extraction\n\n`;

        response += `**Product URLs for onboarding:**\n`;
        response += '```json\n';
        response += JSON.stringify(filterResult.productUrls.slice(0, 10), null, 2);
        response += '\n```\n';
      } else if (state.dryRun) {
        response += `**Fixture exists.** To append URLs, call this tool again with \`dryRun: false\`\n\n`;
        response += `URLs to append: ${successfulExtractions.length} (with successful ID extraction)\n\n`;

        if (failedExtractions.length > 0) {
          response += `⚠️ ${failedExtractions.length} URLs failed extraction and won't be added.\n`;
          response += `Consider updating store-registry patterns to handle these URLs.\n`;
        }
      } else {
        // Actually append URLs
        if (successfulExtractions.length > 0) {
          // Build test cases in the format expected by appendToFixture
          const testCases = successfulExtractions.map((r) => ({
            url: r.url,
            expectedSkus: r.ids.map((id) => id.toLowerCase()),
          }));

          const appendResult = await StoreOnboardingManager.appendToFixture(
            storeMetadata.domain,
            testCases,
          );

          response += `### Append Results\n\n`;
          if (appendResult.success) {
            response += `✓ Successfully appended ${appendResult.added} new URL(s) to fixture\n`;
            response += `- File: ${appendResult.filePath}\n`;
            response += `- Duplicates skipped: ${appendResult.duplicates}\n\n`;

            response += `**Next steps:**\n`;
            response += `1. Run tests: \`pnpm --filter @rr/product-id-extractor test\`\n`;
            response += `2. Review changes and commit if tests pass\n`;
          } else {
            response += `✗ Failed to append URLs: ${appendResult.error}\n`;
          }
        } else {
          response += `No URLs with successful ID extraction to append.\n`;
        }
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}
