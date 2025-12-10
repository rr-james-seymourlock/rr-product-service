# @rr/product-event-normalizer

Normalize raw product view event data from Rakuten apps and browser extensions into clean, enriched product arrays with comprehensive identifier coverage and variant-level data for cart enrichment.

## Overview

### What it does

The product data normalizer transforms raw product view event JSON (from PDP page visits) into a standardized array of `NormalizedProduct` objects. It handles:

- Field name normalization between Toolbar and App sources
- Consolidates product identifiers from multiple schema.org sources (SKU, GTIN, MPN, productID, offers)
- Builds variant-specific data for joining with cart items
- Integrates with `@rr/product-id-extractor` for URL-based ID extraction

### Why it exists

Product view events from PDP pages are richer than cart data, containing schema.org structured data with:

- **Multiple ID sources**: SKUs, GTINs, MPNs, productIDs scattered across different fields
- **Inconsistent naming**: Toolbar uses `sku`, `offers`, `gtin`; App uses `sku_list`, `offer_list`, `gtin_list`
- **Multi-variant products**: Single pages with multiple SKUs/prices (size variants, color options)
- **Correlation maps**: `urlToSku` and `priceToSku` linking offers to specific identifiers
- **Array formats**: Toolbar often wraps single values in arrays (e.g., `name: ["Product Name"]`)

Without normalization, downstream consumers would need to handle all these variations. This package provides:

- **Unified output schema** with shared product-level data and variant-specific arrays
- **ID consolidation** from all available sources with deduplication
- **Variant objects** for joining cart items to the correct product variant
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

- Cart enrichment pipelines (joining cart items to product variants)
- Snowflake data pipelines for product analytics
- Catalog matching systems needing comprehensive identifiers
- ML models for product recommendations
- Brand-level analytics and reporting

### When to use it

Use this package when you need to:

- Transform raw product view JSON into clean product arrays
- Consolidate product IDs from multiple schema.org sources
- Build variant-specific data for cart-to-product joining
- Ensure consistent field naming across Toolbar and App data
- Extract brand, category, and other metadata from PDP data

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

- **Field normalization**: Handles both Toolbar (`sku`, `offers`) and App (`sku_list`, `offer_list`) conventions
- **Array format support**: Handles Toolbar's array-wrapped single values (e.g., `name: ["Product"]`)
- **Nested price objects**: Parses `{ amount: "29.99", currency: "USD" }` format from Toolbar
- **Variant building**: Creates variant objects with SKU, URL, price, color, and extracted IDs
- **ID consolidation**: Extracts from `sku`, `gtin`, `productID`, `mpn`, `offers`, `urlToSku`, `priceToSku`
- **URL fallback**: Uses `@rr/product-id-extractor` when no schema IDs are available
- **Deduplication**: Removes duplicate IDs and variants across all sources
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
  name: ['Womens Short Sleeve Slim Fit Ribbed T-Shirt'], // Toolbar array format
  url: ['https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt/-/A-88056717'],
  sku: ['88056717', '88056723', '88056720'],
  offers: [
    { price: { amount: '8.00', currency: 'USD' }, sku: '88056717' },
    { price: { amount: '8.00', currency: 'USD' }, sku: '88056723' },
    { price: { amount: '9.00', currency: 'USD' }, sku: '88056720' },
  ],
  brand: ['A New Day'],
  rating: [4.2],
  category: ["Women's Clothing"],
};

const products = normalizeProductViewEvent(rawEvent);
// Returns:
// [
//   {
//     // Shared product-level data
//     title: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
//     url: 'https://www.target.com/p/...',
//     storeId: '5246',
//     brand: 'A New Day',
//     rating: 4.2,
//     category: "Women's Clothing",
//
//     // Aggregated identifiers
//     ids: {
//       productIds: [],
//       extractedIds: ['88056717'],
//       skus: ['88056717', '88056723', '88056720'],
//       gtins: [],
//       mpns: [],
//     },
//
//     // Variant-specific data
//     variants: [
//       { sku: '88056717', price: 800, currency: 'USD' },
//       { sku: '88056723', price: 800, currency: 'USD' },
//       { sku: '88056720', price: 900, currency: 'USD' },
//     ],
//     variantCount: 3,
//     hasVariants: true,
//
//     // Legacy/primary fields
//     price: 800,
//     currency: 'USD',
//   }
// ]
```

### With URL-to-SKU Correlation

```typescript
const eventWithUrlToSku = {
  store_id: 5246,
  name: 'Product with Variants',
  urlToSku: {
    'https://target.com/p/product/-/A-111': 'SKU-111',
    'https://target.com/p/product/-/A-222': 'SKU-222',
  },
  url: ['https://target.com/p/product/-/A-111', 'https://target.com/p/product/-/A-222'],
  image: ['https://image1.jpg', 'https://image2.jpg'],
  color: ['Red', 'Blue'],
};

const products = normalizeProductViewEvent(eventWithUrlToSku);
// variants will have correlated URLs, images, colors, and extractedIds
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
// Returns only: title, url, imageUrl, storeId, price, ids, variants
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

## Output Schema

The `NormalizedProduct` schema provides a clean, consistent structure:

```typescript
interface NormalizedProduct {
  // ========== SHARED PRODUCT-LEVEL DATA ==========
  title?: string;           // Product name (first value if array)
  url?: string;             // Primary product URL
  imageUrl?: string;        // Primary product image
  storeId?: string;         // Rakuten store ID (coerced to string)
  storeName?: string;       // Store name
  brand?: string;           // Product brand
  description?: string;     // Product description
  category?: string;        // Category or breadcrumbs
  rating?: number;          // Product rating (0-5)
  canonicalUrl?: string;    // Canonical URL if provided

  // ========== AGGREGATED IDENTIFIERS ==========
  ids: {
    productIds: readonly string[];   // From productID field
    extractedIds: readonly string[]; // From URL extraction
    skus: readonly string[];         // All SKUs from all sources
    gtins: readonly string[];        // All GTINs
    mpns: readonly string[];         // All MPNs
  };

  // ========== VARIANT-SPECIFIC DATA ==========
  variants: readonly ProductVariant[];  // Array of variant objects
  variantCount: number;                 // Number of variants
  hasVariants: boolean;                 // True if multiple variants

  // ========== LEGACY/PRIMARY FIELDS ==========
  price?: number;     // Primary price in cents
  currency?: string;  // Primary currency code
  color?: string;     // Primary color
}

interface ProductVariant {
  sku: string;                          // Required: variant SKU
  url?: string;                         // Variant-specific URL
  imageUrl?: string;                    // Variant-specific image
  price?: number;                       // Price in cents
  currency?: string;                    // Currency code
  color?: string;                       // Variant color
  extractedIds?: readonly string[];     // IDs extracted from variant URL
}
```

## Variant Building Priority

Variants are built from these sources in priority order:

1. **urlToSku map** (highest priority) - Most reliable for variant correlation
2. **Toolbar offers array** - Contains SKU, URL, and price
3. **App offer_list array** - Contains offer_sku, offer_amount, offer_currency
4. **SKU array fallback** - Uses parallel arrays for correlation

When `urlToSku` is present, variants include correlated image, color, and price data based on array index matching.

## Input Schema

The `RawProductViewEvent` schema accepts product view events from both Toolbar and App sources:

```typescript
interface RawProductViewEvent {
  // Store identification
  store_id?: string | number;
  store_name?: string;

  // Product info - can be string OR array (Toolbar uses arrays)
  name?: string | string[];
  url?: string | string[];
  product_url?: string;
  page_url?: string;

  // Images
  image?: string[];
  image_url?: string;
  image_url_list?: string[];

  // Product identifiers - both singular and _list formats supported
  sku?: string[];
  sku_list?: string[];
  gtin?: string[];
  gtin_list?: string[];
  productID?: string[];
  productid_list?: string[];
  mpn?: string[];
  mpn_list?: string[];

  // Offers - Toolbar vs App format
  offers?: Array<{
    price?: number | { amount?: string | number; currency?: string };
    sku?: string;
    url?: string;
  }>;
  offer_list?: Array<{
    offer_amount?: string | number;
    offer_currency?: string;
    offer_sku?: string;
  }>;

  // SKU correlation maps (Toolbar only)
  urlToSku?: Record<string, string | string[]>;
  priceToSku?: Record<string, string | string[]>;

  // Metadata - can be string OR array
  brand?: string | string[];
  brand_list?: string[];
  rating?: number | string | (number | string)[];
  description?: string | string[];
  category?: string | string[];
  breadcrumbs?: string | string[];
  color?: string | string[];
  color_list?: string[];
  canonical?: string[];
}
```

## Field Mapping

| Input Field                       | Output Field        | Notes                                      |
| --------------------------------- | ------------------- | ------------------------------------------ |
| `name` (first value)              | `title`             | Extracts first string from array           |
| `url/product_url/page_url`        | `url`               | Priority: canonical > url > product_url    |
| `image_url/image[0]`              | `imageUrl`          | Prefers image_url                          |
| `store_id`                        | `storeId`           | Coerced to string                          |
| `offers[0].price`                 | `price`             | Converted to cents                         |
| `brand` (first value)             | `brand`             | Extracts first string from array           |
| `category/breadcrumbs`            | `category`          | Prefers category                           |
| `color` (first value)             | `color`             | Extracts first string from array           |
| `sku + sku_list + offers.sku`     | `ids.skus`          | Deduplicated from all sources              |
| `gtin + gtin_list`                | `ids.gtins`         | Combined and deduplicated                  |
| `mpn + mpn_list`                  | `ids.mpns`          | Combined and deduplicated                  |
| `productID + productid_list`      | `ids.productIds`    | Combined and deduplicated                  |
| URL extraction                    | `ids.extractedIds`  | From primary URL via product-id-extractor  |
| `urlToSku/offers/offer_list/sku`  | `variants`          | Built in priority order                    |

## API Reference

### `normalizeProductViewEvent(event, options?)`

Normalizes a raw product view event into an array of NormalizedProduct objects.

**Parameters:**

- `event` (RawProductViewEvent) - Raw product view event from apps/extensions
- `options.validate` (boolean, default: false) - Enable Zod schema validation
- `options.extractProductIds` (boolean, default: true) - Enable URL-based ID extraction
- `options.includeMetadata` (boolean, default: true) - Include extended metadata fields

**Returns:**

- `readonly NormalizedProduct[]` - Frozen array of normalized products (typically 1)

### Exported Schemas

```typescript
import {
  RawProductViewEventSchema,
  ToolbarOfferSchema,
  AppOfferSchema,
  NormalizedProductSchema,
  ProductVariantSchema,
} from '@rr/product-event-normalizer';
```

### Exported Types

```typescript
import type {
  RawProductViewEvent,
  ToolbarOffer,
  AppOffer,
  NormalizedProduct,
  ProductVariant,
  NormalizeProductViewEventOptions,
} from '@rr/product-event-normalizer';
```

## Immutability

All output is frozen for safe caching and sharing:

```typescript
const products = normalizeProductViewEvent(event);

Object.isFrozen(products); // true
Object.isFrozen(products[0]); // true
Object.isFrozen(products[0].ids); // true
Object.isFrozen(products[0].ids.skus); // true
Object.isFrozen(products[0].variants); // true
```

## Testing

Run tests:

```bash
pnpm --filter @rr/product-event-normalizer test
```

### Test Coverage

The test suite covers:

- Basic normalization for Toolbar and App events
- Array format handling (Toolbar wrapping single values)
- Nested price object parsing
- Variant building from all sources (urlToSku, offers, offer_list, sku arrays)
- Variant deduplication by SKU
- Variant-specific extractedIds from URLs
- ID consolidation from all sources
- Store ID type coercion
- Metadata extraction (brand, rating, category, color)
- Validation option behavior
- Immutability guarantees
- Edge cases (empty arrays, missing fields, whitespace values)

## Dependencies

- `zod` - Schema validation and type inference
- `@rr/product-id-extractor` - Extract product IDs from URLs
- `@rr/url-parser` - Parse URL components for extraction
- `@rr/shared` - Shared utilities and ProductIds type

## Maintenance

When updating:

1. Update schemas in `src/types.ts` for new fields
2. Update extraction logic in `src/normalizer.ts`
3. Add test fixtures for new edge cases
4. Run full test suite: `pnpm --filter @rr/product-event-normalizer test`
5. Regenerate OpenAPI spec: `pnpm --filter @rr/product-service run openapi:generate`
6. Update this README with new examples
