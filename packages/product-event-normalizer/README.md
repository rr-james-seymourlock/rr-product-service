# @rr/product-event-normalizer

Normalize raw product view event data from Rakuten apps and browser extensions into clean, enriched product arrays with comprehensive identifier coverage.

## Overview

### What it does

The product data normalizer transforms raw product view event JSON (from PDP page visits) into a standardized array of `NormalizedProduct` objects. It handles field name normalization between Toolbar and App sources, consolidates product identifiers from multiple schema.org sources (SKU, GTIN, MPN, productID, offers), and integrates with `@rr/product-id-extractor` for URL-based ID extraction as a fallback.

### Why it exists

Product view events from PDP pages are richer than cart data, containing schema.org structured data with:

- **Multiple ID sources**: SKUs, GTINs, MPNs, productIDs scattered across different fields
- **Inconsistent naming**: Toolbar uses `sku`, `offers`, `gtin`; App uses `sku_list`, `offer_list`, `gtin_list`
- **Multi-variant products**: Single pages with multiple SKUs/prices (size variants, color options)
- **Correlation maps**: `urlToSku` and `priceToSku` linking offers to specific identifiers

Without normalization, downstream consumers would need to handle all these variations. This package provides:

- **Unified output schema** compatible with `CartProduct` from `@rr/cart-event-normalizer`
- **ID consolidation** from all available sources with deduplication
- **Dual convention support** for Toolbar and App field naming
- **Rich metadata extraction** (brand, category, rating, color, description)
- **Immutable output** for safe caching and sharing

### Where it's used

This package processes product view events in the data pipeline:

```
Raw Product View Event → normalizeProductViewEvent → NormalizedProduct[]
                         (@rr/product-event-normalizer)
```

Consumers include:

- Snowflake data pipelines for product analytics
- Catalog matching systems needing comprehensive identifiers
- ML models for product recommendations
- Brand-level analytics and reporting
- Price tracking and competitive intelligence

### When to use it

Use this package when you need to:

- Transform raw product view JSON into clean product arrays
- Consolidate product IDs from multiple schema.org sources
- Ensure consistent field naming across Toolbar and App data
- Extract brand, category, and other metadata from PDP data

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

- **Field normalization**: Handles both Toolbar (`sku`, `offers`) and App (`sku_list`, `offer_list`) conventions
- **ID consolidation**: Extracts from `sku`, `gtin`, `productID`, `mpn`, `offers`, `urlToSku`, `priceToSku`
- **URL fallback**: Uses `@rr/product-id-extractor` when no schema IDs are available
- **Deduplication**: Removes duplicate IDs across all sources
- **Rich metadata**: Extracts brand, category, rating, color, description
- **Type coercion**: Handles both string and numeric `store_id` values
- **Immutable output**: Frozen arrays and objects for safe caching
- **Zod schemas**: Full TypeScript types with runtime validation option

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { normalizeProductViewEvent } from '@rr/product-event-normalizer';
```

## Usage

### Basic Usage

```typescript
import { normalizeProductViewEvent } from '@rr/product-event-normalizer';

const rawEvent = {
  store_id: 5246,
  store_name: 'target.com',
  name: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
  url: 'https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt/-/A-88056717',
  sku: ['88056717', '88056723', '88056720'],
  offers: [
    { price: 800, sku: '88056717' },
    { price: 800, sku: '88056723' },
  ],
  brand: 'A New Day',
  rating: 4.2,
  category: "Women's Clothing",
};

const products = normalizeProductViewEvent(rawEvent);
// Returns:
// [
//   {
//     title: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
//     url: 'https://www.target.com/p/...',
//     storeId: '5246',
//     price: 800,
//     productIds: ['88056717', '88056723', '88056720'],
//     brand: 'A New Day',
//     rating: 4.2,
//     category: "Women's Clothing",
//     skus: ['88056717', '88056723', '88056720'],
//   }
// ]
```

### With Validation

```typescript
import { normalizeProductViewEvent } from '@rr/product-event-normalizer';

// Enable Zod schema validation for debugging
const products = normalizeProductViewEvent(rawEvent, { validate: true });
```

### Without Metadata

```typescript
import { normalizeProductViewEvent } from '@rr/product-event-normalizer';

// Skip metadata fields for leaner output
const products = normalizeProductViewEvent(rawEvent, { includeMetadata: false });
// Returns only: title, url, imageUrl, storeId, price, productIds
```

### Disable URL Extraction Fallback

```typescript
import { normalizeProductViewEvent } from '@rr/product-event-normalizer';

// Skip URL-based ID extraction
const products = normalizeProductViewEvent(rawEvent, { extractProductIds: false });
// productIds will only contain schema-based IDs
```

### App Format (Mobile)

```typescript
const appEvent = {
  store_id: '8333', // String from mobile app
  store_name: "Macy's",
  name: "Women's Cotton Sweater",
  url: 'https://www.macys.com/shop/product?ID=12345678',
  sku_list: ['12345678'],
  offer_list: [{ offer_amount: 4900, offer_currency: 'USD', offer_sku: '12345678' }],
  brand_list: ['Charter Club'],
  image_url_list: ['https://slimages.macysassets.com/image1.jpg'],
};

const products = normalizeProductViewEvent(appEvent);
// Handles _list suffix fields automatically
```

## Input Schema

The `RawProductViewEvent` schema accepts product view events from both Toolbar and App sources:

```typescript
interface RawProductViewEvent {
  // Store identification
  store_id?: string | number; // App sends string, Toolbar sends number
  store_name?: string;

  // Product info
  name?: string;
  url?: string;
  product_url?: string;
  page_url?: string;

  // Images - Toolbar vs App
  image_url?: string;
  image_url_list?: string[];

  // Product identifiers - Toolbar (singular) vs App (_list suffix)
  sku?: string[];
  sku_list?: string[];
  gtin?: string[];
  gtin_list?: string[];
  productID?: string[];
  productid_list?: string[];
  mpn?: string[];
  mpn_list?: string[];

  // Offers - Toolbar vs App
  offers?: Array<{ price?: number; sku?: string; url?: string }>;
  offer_list?: Array<{ offer_amount?: number; offer_currency?: string; offer_sku?: string }>;

  // SKU correlation maps (Toolbar only)
  urlToSku?: Record<string, string>;
  priceToSku?: Record<string, string>;

  // Metadata
  brand?: string;
  brand_list?: string[];
  rating?: number;
  description?: string;
  category?: string;
  breadcrumbs?: string;
  color?: string;
  color_list?: string[];

  // ... source metadata fields
}
```

## Output Schema

The `NormalizedProduct` schema provides a clean, consistent structure:

```typescript
interface NormalizedProduct {
  // Core fields (compatible with CartProduct)
  title?: string; // Mapped from name
  url?: string; // Best URL from url/product_url/page_url
  imageUrl?: string; // From image_url or image_url_list[0]
  storeId?: string; // Always string, coerced from event
  price?: number; // From offers[0].price or offer_list[0].offer_amount
  productIds: readonly string[]; // Consolidated from all sources

  // Extended metadata fields
  brand?: string; // From brand or brand_list[0]
  category?: string; // From category or breadcrumbs
  description?: string;
  rating?: number;
  color?: string; // From color or color_list[0]

  // Specific identifier arrays (when includeMetadata: true)
  skus?: readonly string[]; // Deduplicated SKUs
  gtins?: readonly string[]; // Deduplicated GTINs
  mpns?: readonly string[]; // Deduplicated MPNs
}
```

## Product ID Extraction Sources

IDs are collected from these sources (in order of processing):

1. **sku / sku_list** - Direct SKU arrays
2. **gtin / gtin_list** - Global Trade Item Numbers
3. **productID / productid_list** - Generic product identifiers
4. **mpn / mpn_list** - Manufacturer Part Numbers
5. **offers[].sku / offer_list[].offer_sku** - SKUs from offer objects
6. **urlToSku** - Map values correlating URLs to SKUs
7. **priceToSku** - Map values correlating prices to SKUs
8. **URL extraction** - Fallback via `@rr/product-id-extractor` if no schema IDs found

All IDs are deduplicated and empty/whitespace values are filtered.

## Field Mapping

| Input Field            | Output Field   | Notes                            |
| ---------------------- | -------------- | -------------------------------- |
| `name`                 | `title`        | Whitespace-only names excluded   |
| `url/product_url/page_url` | `url`      | Priority: url > product_url > page_url |
| `image_url/image_url_list[0]` | `imageUrl` | Prefers image_url              |
| `store_id`             | `storeId`      | Coerced to string                |
| `offers[0].price`      | `price`        | Or offer_list[0].offer_amount    |
| `brand/brand_list[0]`  | `brand`        | Prefers brand                    |
| `category/breadcrumbs` | `category`     | Prefers category                 |
| `color/color_list[0]`  | `color`        | Prefers color                    |
| _(consolidated)_       | `productIds`   | From all sources above           |

## Store ID Handling

The `store_id` field is coerced to a string regardless of input type:

```typescript
// Toolbar events - numeric store_id
{ store_id: 5246 } → storeId: '5246'

// App events - string store_id
{ store_id: '8333' } → storeId: '8333'

// Non-numeric string IDs preserved
{ store_id: 'uk-87262' } → storeId: 'uk-87262'

// Empty/whitespace - undefined
{ store_id: '   ' } → storeId: undefined
```

## Immutability

All output is frozen for safe caching and sharing:

```typescript
const products = normalizeProductViewEvent(event);

Object.isFrozen(products); // true
Object.isFrozen(products[0]); // true
Object.isFrozen(products[0].productIds); // true
Object.isFrozen(products[0].skus); // true
```

## API Reference

### `normalizeProductViewEvent(event, options?)`

Normalizes a raw product view event into an array of NormalizedProduct objects.

**Parameters:**

- `event` (RawProductViewEvent) - Raw product view event from apps/extensions
- `options.validate` (boolean, default: false) - Enable Zod schema validation
- `options.extractProductIds` (boolean, default: true) - Enable URL-based ID extraction fallback
- `options.includeMetadata` (boolean, default: true) - Include extended metadata fields

**Returns:**

- `readonly NormalizedProduct[]` - Frozen array of normalized products

**Example:**

```typescript
const products = normalizeProductViewEvent(rawEvent, {
  validate: true,
  extractProductIds: true,
  includeMetadata: true,
});
```

### Exported Schemas

```typescript
import {
  RawProductViewEventSchema,
  ToolbarOfferSchema,
  AppOfferSchema,
  NormalizedProductSchema,
} from '@rr/product-event-normalizer';
```

### Exported Types

```typescript
import type {
  RawProductViewEvent,
  ToolbarOffer,
  AppOffer,
  NormalizedProduct,
  NormalizeProductViewEventOptions,
} from '@rr/product-event-normalizer';
```

## Testing

Run tests:

```bash
pnpm --filter @rr/product-event-normalizer test
```

### Test Coverage

The test suite covers:

- Basic normalization for Toolbar and App events
- ID consolidation from all sources (sku, gtin, offers, urlToSku, etc.)
- Deduplication across sources
- Store ID type coercion
- Field extraction and mapping
- URL fallback behavior
- Metadata extraction (brand, rating, category, color)
- Validation option behavior
- Immutability guarantees
- Edge cases (empty arrays, missing fields, whitespace values)

## Dependencies

- `zod` - Schema validation and type inference
- `@rr/product-id-extractor` - Extract product IDs from URLs
- `@rr/url-parser` - Parse URL components for extraction
- `@rr/shared` - Shared utilities (coerceStoreId)

## Maintenance

When updating:

1. Update schemas in `src/types.ts` for new fields
2. Update extraction logic in `src/normalizer.ts`
3. Add test fixtures for new edge cases
4. Run full test suite: `pnpm --filter @rr/product-event-normalizer test`
5. Update this README with new examples
