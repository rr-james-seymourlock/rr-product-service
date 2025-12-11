# @rr/cart-enricher

Enrich sparse cart data with rich product view data by matching cart items to previously viewed products.

## Overview

### What it does

The cart enricher takes a normalized cart (from `@rr/cart-event-normalizer`) and an array of normalized products (from `@rr/product-event-normalizer`) from the same browsing session, then matches and merges the data. It outputs `EnrichedCartItem` objects containing combined fields from both sources, with metadata indicating match confidence, method, and data provenance.

### Why it exists

Cart abandonment data is critical for re-engaging members, but cart events contain minimal product information (title, URL, price, quantity). Meanwhile, product view events captured from PDPs contain rich metadata (brand, category, description, rating, images, multiple identifiers).

Since users typically view a product before adding to cart, we can correlate these events to enrich cart data:

- **Rich product metadata** for cart abandonment emails
- **Brand-level segmentation** for targeted campaigns
- **Category-based recommendations**
- **Price drop alerts** using tracked pricing
- **More accurate product matching** for affiliate attribution

### Where it's used

This package enriches cart data in the data pipeline:

```
┌─────────────────┐     ┌─────────────────┐
│  Cart Event     │     │  Product Views  │
│  (sparse data)  │     │  (rich data)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    @rr/cart-enricher  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   EnrichedCart        │
         │   - Combined metadata │
         │   - Match confidence  │
         │   - Data provenance   │
         └───────────────────────┘
```

Consumers include:

- Snowflake data pipelines for cart abandonment analytics
- Marketing automation for personalized re-engagement campaigns
- ML models for shopping behavior analysis
- Real-time cart enrichment for personalization

### When to use it

Use this package when you need to:

- Enrich cart items with product view metadata
- Match cart items to products using multiple ID strategies
- Track match confidence and data provenance
- Create unified cart-product datasets for analytics

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

- **Multi-strategy matching**: SKU → variant SKU → image SKU → URL → extracted IDs → title+color → title similarity
- **Confidence scoring**: High (SKU), Medium (URL/IDs), Low (title)
- **Multiple signals tracking**: All matching methods that succeeded are reported
- **Exact match tracking**: Each signal marked as exact (true) or fuzzy (false)
- **Field merging**: Cart-specific fields + product metadata with clear precedence
- **Provenance tracking**: Know which data came from cart vs product view
- **Variant-aware matching**: Matches against product.variants[].sku and variant URLs
- **Price matching**: Optional price proximity as supporting signal
- **Title similarity algorithms**: Levenshtein, Dice coefficient, token-based, containment check
- **Immutable output**: Frozen arrays and objects for safe caching
- **Zod schemas**: Full TypeScript types with runtime validation option

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { enrichCart } from '@rr/cart-enricher';
```

## Usage

### Basic Usage

```typescript
import { enrichCart } from '@rr/cart-enricher';
import type { CartProduct } from '@rr/cart-event-normalizer/types';
import type { NormalizedProduct } from '@rr/product-event-normalizer/types';

const cart: CartProduct[] = [
  {
    title: 'Sport Cap - White',
    url: 'https://gymshark.com/products/sport-cap-white',
    imageUrl: 'https://cdn.gymshark.com/images/I3A6W-WHTL.jpg',
    storeId: 'gymshark',
    price: 1800,
    quantity: 1,
    lineTotal: 1800,
    ids: { skus: [], extractedIds: [], productIds: [] },
  },
];

const products: NormalizedProduct[] = [
  {
    title: 'Sport Cap',
    url: 'https://gymshark.com/products/sport-cap',
    imageUrl: 'https://cdn.gymshark.com/images/I3A6W-MAIN.jpg',
    storeId: 'gymshark',
    price: 1800,
    color: 'White',
    ids: { skus: ['I3A6W'], extractedIds: [], productIds: [] },
    variants: [],
  },
];

const enrichedCart = enrichCart(cart, products);

// Returns EnrichedCart with:
// - items: Array of enriched cart items with product metadata
// - summary: { totalItems, matchedItems, unmatchedItems, matchRate, byConfidence, byMethod }
// - enrichedAt: ISO timestamp
```

### With Options

```typescript
const enrichedCart = enrichCart(cart, products, {
  // Only accept SKU-based matches (default: 'high')
  minConfidence: 'high',

  // Enable Zod validation for debugging
  validate: true,

  // Title similarity threshold (default: 0.8)
  titleSimilarityThreshold: 0.75,
});
```

### Accessing Match Details

```typescript
const enrichedCart = enrichCart(cart, products, { minConfidence: 'medium' });

for (const item of enrichedCart.items) {
  console.log(`${item.title}`);
  console.log(`  Matched: ${item.wasViewed}`);
  console.log(`  Confidence: ${item.matchConfidence}`);
  console.log(`  Primary method: ${item.matchMethod}`);
  console.log(`  All signals: ${JSON.stringify(item.matchedSignals)}`);
  console.log(`  Sources: ${JSON.stringify(item.sources)}`);

  // Example output:
  // Sport Cap - White
  //   Matched: true
  //   Confidence: high
  //   Primary method: image_sku
  //   All signals: [
  //     { method: "image_sku", confidence: "high", exact: true },
  //     { method: "title", confidence: "low", exact: false },
  //     { method: "price", confidence: "low", exact: true }
  //   ]
  //   Sources: { title: "cart", url: "cart", imageUrl: "cart", price: "cart" }
}
```

## Matching Strategies

The enricher tries multiple matching strategies in order of confidence:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Matching Strategy Chain                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  HIGH CONFIDENCE                                                        │
│  ┌─────────────┐                                                        │
│  │ SKU Match   │  cart.ids.skus ∩ product.ids.skus                     │
│  └──────┬──────┘                                                        │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ Variant SKU │  cart.ids.skus ∩ product.variants[].sku              │
│  └──────┬──────┘                                                        │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ Image SKU   │  SKU extracted from cart imageUrl filename             │
│  └──────┬──────┘                                                        │
│         │                                                               │
│  MEDIUM CONFIDENCE                                                      │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ URL Match   │  Normalized URL equality                               │
│  └──────┬──────┘                                                        │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ Extracted ID│  cart.ids.extractedIds ∩ product.ids.extractedIds    │
│  └──────┬──────┘                                                        │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ Title+Color │  Exact title match + color match from cart suffix      │
│  └──────┬──────┘                                                        │
│         │                                                               │
│  LOW CONFIDENCE                                                         │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ Title Fuzzy │  Multi-algorithm similarity (Dice, Levenshtein, etc)  │
│  └──────┬──────┘                                                        │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ Price Match │  Price within 10% tolerance (supporting signal only)  │
│  └─────────────┘                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Strategy Details

| Strategy     | Confidence | Exact | Description                                         |
| ------------ | ---------- | ----- | --------------------------------------------------- |
| `sku`        | high       | true  | Direct SKU intersection                             |
| `variant_sku`| high       | true  | Cart SKU matches product variant SKU                |
| `image_sku`  | high       | true  | SKU extracted from cart image URL filename          |
| `url`        | medium     | true  | Normalized URL equality                             |
| `extracted_id`| medium    | true  | Extracted IDs overlap (e.g., product IDs from URL)  |
| `title_color`| medium     | true  | Title + color match (cart "Cap - White" → product "Cap" + color "White") |
| `title`      | low        | false | Multi-strategy fuzzy title matching                 |
| `price`      | low        | varies| Price within 10% tolerance (supporting signal only) |

## Title Matching Algorithms

The title matching uses multiple strategies and returns the highest score:

1. **Exact match** → 1.0
2. **Containment check** → 0.95 (handles "Sport Cap" matching "Sport Cap - White")
3. **Token-based Dice coefficient** → Word-level comparison
4. **Bigram-based Dice coefficient** → Character n-gram comparison
5. **Levenshtein similarity** → Edit distance (via `fastest-levenshtein`)

### Handling Cart Title Formats

The enricher handles various cart title formats:

```typescript
// Gymshark format: "Title - Color"
"Sport Cap - White" → { base: "Sport Cap", color: "White" }

// Sam's Club format: "Title Color Size:- Color, Size"
"Champion Boys Logo Jogger Grey M:- Grey, M" → { base: "Champion Boys Logo Jogger", color: "Grey M" }

// Standard format (no suffix)
"Sport Cap" → { base: "Sport Cap", color: undefined }
```

## Output Schema

### EnrichedCart

```typescript
interface EnrichedCart {
  storeId?: string;
  items: readonly EnrichedCartItem[];
  summary: EnrichmentSummary;
  enrichedAt: string; // ISO timestamp
}
```

### EnrichedCartItem

```typescript
interface EnrichedCartItem {
  // Product data (merged from cart + product)
  title?: string;
  url?: string;
  imageUrl?: string;
  storeId?: string;
  price?: number; // Cart price (what user saw)
  currency?: string;
  brand?: string; // From product view
  description?: string; // From product view
  category?: string; // From product view
  rating?: number; // From product view

  // Cart-specific
  quantity?: number;
  lineTotal?: number;

  // Identifiers (merged)
  ids: ProductIds;

  // Match metadata
  inCart: boolean; // Always true for cart enrichment
  wasViewed: boolean; // True if matched to product view
  matchConfidence: 'high' | 'medium' | 'low' | 'none';
  matchMethod: 'sku' | 'variant_sku' | 'image_sku' | 'url' | 'extracted_id' | 'title_color' | 'title' | 'price' | null;
  matchedSignals: MatchedSignal[]; // All matching methods that succeeded
  enrichedAt: string;
  sources: FieldSources; // Provenance tracking

  // Variant data (when variant-level match)
  matchedVariant?: MatchedVariant;
}
```

### MatchedSignal

```typescript
interface MatchedSignal {
  method: 'sku' | 'variant_sku' | 'image_sku' | 'url' | 'extracted_id' | 'title_color' | 'title' | 'price';
  confidence: 'high' | 'medium' | 'low';
  exact: boolean; // true = exact match, false = fuzzy/within tolerance
}
```

### EnrichmentSummary

```typescript
interface EnrichmentSummary {
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
  matchRate: number; // 0-100 percentage

  byConfidence: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };

  byMethod: {
    sku: number;
    variant_sku: number;
    image_sku: number;
    url: number;
    extracted_id: number;
    title_color: number;
    title: number;
    price: number;
  };
}
```

## Field Precedence

| Field         | Source Priority          | Notes                                    |
| ------------- | ------------------------ | ---------------------------------------- |
| `title`       | Cart → Product           | Cart title preserved (may include color) |
| `url`         | Cart → Product           | Cart URL has user's actual session URL   |
| `imageUrl`    | Cart → Product           | Cart image shows exact variant           |
| `price`       | Cart only                | Cart price is what user saw              |
| `quantity`    | Cart only                | Cart-specific                            |
| `lineTotal`   | Cart only                | Cart-specific                            |
| `brand`       | Product only             | Only from product view                   |
| `description` | Product only             | Only from product view                   |
| `category`    | Product only             | Only from product view                   |
| `rating`      | Product only             | Only from product view                   |
| `ids`         | Merged (cart + product)  | All IDs from both sources                |

## API Reference

### `enrichCart(cart, products, options?)`

Enriches cart items with product view data.

**Parameters:**

- `cart` (CartProduct[]) - Normalized cart items from `@rr/cart-event-normalizer`
- `products` (NormalizedProduct[]) - Normalized products from `@rr/product-event-normalizer`
- `options.minConfidence` ('high' | 'medium' | 'low', default: 'high') - Minimum match confidence
- `options.validate` (boolean, default: false) - Enable Zod schema validation
- `options.titleSimilarityThreshold` (number, default: 0.8) - Title similarity threshold (0-1)

**Returns:**

- `EnrichedCart` - Enriched cart with items, summary, and timestamp

### Exported Types

```typescript
import type {
  EnrichedCart,
  EnrichedCartItem,
  EnrichmentSummary,
  EnrichCartOptions,
  MatchConfidence,
  MatchMethod,
  MatchedSignal,
  FieldSources,
  MatchedVariant,
} from '@rr/cart-enricher';
```

### Exported Schemas

```typescript
import {
  EnrichedCartSchema,
  EnrichedCartItemSchema,
  EnrichmentSummarySchema,
  MatchConfidenceSchema,
  MatchMethodSchema,
  MatchedSignalSchema,
} from '@rr/cart-enricher';
```

## Testing

Run tests:

```bash
pnpm --filter @rr/cart-enricher test
```

### Test Coverage

The test suite (56 tests) covers:

- Multi-strategy matching (SKU, variant SKU, image SKU, URL, extracted ID, title+color, title)
- Confidence scoring and thresholds
- Field merging and precedence
- Provenance tracking
- Price matching as supporting signal
- Exact vs fuzzy match tracking
- Unmatched item handling
- Immutability guarantees
- Real fixture data (Gymshark, Sam's Club)

## Dependencies

- `zod` - Schema validation and type inference
- `fastest-levenshtein` - Levenshtein distance for title similarity
- `@rr/cart-event-normalizer` - Cart input types
- `@rr/product-event-normalizer` - Product input types
- `@rr/shared` - Shared ProductIds types

## Performance

The enricher is optimized for high-throughput processing:

- **O(n×m) matching**: n cart items × m products
- **Early termination**: Stops at first high-confidence match per item
- **All signals collected**: Continues checking for additional signals
- **No validation by default**: Zod validation is opt-in
- **Frozen output**: Single freeze operation, no deep cloning
- **Pre-compiled patterns**: Title parsing regex compiled once

## Examples

### Gymshark Session (Image SKU Matching)

```typescript
const cart = [
  {
    title: 'Sport Cap - White',
    imageUrl: 'https://cdn.gymshark.com/images/I3A6W-WHTL.jpg',
    price: 1800,
    ids: { skus: [], extractedIds: [], productIds: [] },
  },
];

const products = [
  {
    title: 'Sport Cap',
    color: 'White',
    ids: { skus: ['I3A6W'], extractedIds: [], productIds: [] },
  },
];

const result = enrichCart(cart, products, { minConfidence: 'medium' });
// Match via image_sku (I3A6W extracted from image URL)
// matchedSignals: [image_sku, title, price]
```

### Sam's Club Session (Extracted ID Matching)

```typescript
const cart = [
  {
    title: 'Champion Boys Logo Jogger Grey M:- Grey, M',
    url: 'https://samsclub.com/p/champion-jogger/16675013342',
    ids: { extractedIds: ['16675013342'], skus: [], productIds: [] },
  },
];

const products = [
  {
    title: 'Champion Boys Logo Jogger',
    url: 'https://samsclub.com/p/champion-jogger/16675013342',
    ids: { extractedIds: ['16675013342'], skus: [], productIds: [] },
  },
];

const result = enrichCart(cart, products, { minConfidence: 'medium' });
// Match via extracted_id
// matchedSignals: [extracted_id, title, price]
```

### Unmatched Items

```typescript
const cart = [
  { title: 'Mystery Product', price: 999, ids: { skus: [], extractedIds: [], productIds: [] } },
];

const products = []; // No product views

const result = enrichCart(cart, products);
// Item preserved with:
// - wasViewed: false
// - matchConfidence: 'none'
// - matchMethod: null
// - matchedSignals: []
```

## Maintenance

When updating:

1. Update schemas in `src/types.ts` for new fields
2. Update matching strategies in `src/enricher.ts`
3. Add tests for new matching scenarios
4. Update fixtures for real-world test cases
5. Run: `pnpm --filter @rr/cart-enricher test`
6. Update this README with new examples
