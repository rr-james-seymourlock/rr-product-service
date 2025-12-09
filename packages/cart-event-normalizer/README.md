# @rr/cart-event-normalizer

Normalize raw cart event data from Rakuten apps and browser extensions into clean, enriched product arrays.

## Overview

### What it does

The cart normalizer transforms raw shopping cart event JSON from Rakuten apps and browser toolbar extensions into a standardized array of `CartProduct` objects. It handles field name normalization, type coercion, product validation, and integrates with `@rr/product-id-extractor` to enrich products with extracted identifiers.

### Why it exists

Cart events arrive from multiple sources with inconsistent structures:

- **Toolbar extensions**: Numeric `store_id`, camelCase field variations
- **Mobile apps**: String `store_id`, nested device context
- **Different merchants**: Varying product data completeness

Without normalization, every downstream consumer (analytics pipelines, ML models, dashboards) would need to implement their own parsing logic. This package provides:

- **Unified output schema** with consistent field names
- **Type coercion** for `store_id` (number → string)
- **Product ID extraction** from URLs automatically
- **Smart filtering** to exclude invalid products
- **Immutable output** for safe caching and sharing

### Where it's used

This package processes cart events in the data pipeline:

```
Raw Cart Event → normalizeCartEvent → CartProduct[]
                 (@rr/cart-event-normalizer)
```

Consumers include:

- Snowflake data pipelines for cart analytics
- Real-time dashboards tracking cart activity
- ML models for product recommendations
- Cart abandonment analysis systems

### When to use it

Use this package when you need to:

- Transform raw cart event JSON into clean product arrays
- Extract product IDs from cart product URLs
- Ensure consistent field naming across cart data
- Filter out invalid/incomplete products

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

- **Field normalization**: `name` → `title`, `image_url` → `imageUrl`, `item_price` → `price`
- **Type coercion**: Handles both string and numeric `store_id` values
- **Product ID extraction**: Automatic extraction via `@rr/product-id-extractor`
- **Smart filtering**: Products require URL, or both title AND price
- **Deduplication**: Removes duplicate products by URL (first occurrence kept)
- **Immutable output**: Frozen arrays and objects for safe caching
- **Zod schemas**: Full TypeScript types with runtime validation option
- **Zero config**: Works out of the box with sensible defaults

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { normalizeCartEvent } from '@rr/cart-event-normalizer';
```

## Usage

### Basic Usage

```typescript
import { normalizeCartEvent } from '@rr/cart-event-normalizer';

const rawEvent = {
  store_id: 8333,
  store_name: "Macy's",
  product_list: [
    {
      name: "Women's Cotton Sweater",
      url: 'https://macys.com/shop/product?ID=12345',
      image_url: 'https://macys.com/image.jpg',
      item_price: 4900,
      quantity: 1,
      line_total: 4900,
    },
  ],
};

const products = normalizeCartEvent(rawEvent);
// Returns:
// [
//   {
//     title: "Women's Cotton Sweater",
//     url: 'https://macys.com/shop/product?ID=12345',
//     imageUrl: 'https://macys.com/image.jpg',
//     storeId: '8333',
//     price: 4900,
//     quantity: 1,
//     lineTotal: 4900,
//     productIds: ['12345'],  // Extracted from URL
//   }
// ]
```

### With Validation

```typescript
import { normalizeCartEvent } from '@rr/cart-event-normalizer';

// Enable Zod schema validation for debugging
const products = normalizeCartEvent(rawEvent, { validate: true });
```

### Disable Product ID Extraction

```typescript
import { normalizeCartEvent } from '@rr/cart-event-normalizer';

// Skip URL parsing for performance
const products = normalizeCartEvent(rawEvent, { extractProductIds: false });
// productIds will be empty arrays
```

### Using Schemas Directly

```typescript
import { RawCartEventSchema, CartProductSchema } from '@rr/cart-event-normalizer';

// Validate input manually
const parsed = RawCartEventSchema.parse(rawEvent);

// Use types
import type { RawCartEvent, CartProduct } from '@rr/cart-event-normalizer';
```

## Input Schema

The `RawCartEvent` schema accepts cart events from both App and Toolbar sources:

```typescript
interface RawCartEvent {
  // Store identification
  store_id?: string | number; // App sends string, Toolbar sends number
  store_name?: string;

  // Products
  product_list: RawProduct[];

  // Cart totals
  cart_total?: number;
  cart_total_qty?: number;
  currency?: string;

  // Source metadata (validated but not used in output)
  app_version?: string;
  application_type?: string; // 'App' | 'Toolbar'
  application_subtype?: string;
  browser?: string;
  platform?: string;
  // ... and more optional fields
}

interface RawProduct {
  name?: string;
  url?: string;
  image_url?: string;
  item_price?: number;
  quantity?: number;
  line_total?: number;
}
```

## Output Schema

The `CartProduct` schema provides a clean, consistent structure:

```typescript
interface CartProduct {
  title?: string; // Mapped from name
  url?: string; // Product URL
  imageUrl?: string; // Mapped from image_url
  storeId?: string; // Always string, from parent event
  price?: number; // Mapped from item_price
  quantity?: number; // Direct mapping
  lineTotal?: number; // Mapped from line_total
  productIds: readonly string[]; // Extracted from URL
}
```

## Product Validation

Products are filtered based on data completeness:

### Valid Products

A product is included if it has:

1. **A URL** (regardless of other fields), OR
2. **Both title AND price** (when URL is missing)

### Examples

```typescript
// Valid - has URL
{ url: 'https://example.com/product' }

// Valid - has URL + other fields
{ url: 'https://example.com/product', name: 'Widget', item_price: 999 }

// Valid - no URL but has both name AND price
{ name: 'Widget', item_price: 999 }

// Invalid - only name, no URL, no price
{ name: 'Widget' }

// Invalid - only price, no URL, no name
{ item_price: 999 }

// Invalid - no useful data
{ image_url: 'https://example.com/image.jpg' }
```

## Field Mapping

| Input Field   | Output Field | Notes                           |
| ------------- | ------------ | ------------------------------- |
| `name`        | `title`      | Whitespace-only names excluded  |
| `url`         | `url`        | Direct mapping                  |
| `image_url`   | `imageUrl`   | camelCase conversion            |
| `item_price`  | `price`      | Direct mapping (0 is valid)     |
| `quantity`    | `quantity`   | Direct mapping (0 is valid)     |
| `line_total`  | `lineTotal`  | camelCase conversion            |
| `store_id`    | `storeId`    | Coerced to string, from event   |
| _(extracted)_ | `productIds` | From URL via product-id-extractor |

## Store ID Handling

The `store_id` field is coerced to a string regardless of input type. This ensures consistency and supports non-numeric store IDs (e.g., `"uk-87262"`):

```typescript
// Toolbar events - numeric store_id
{ store_id: 8333 } → storeId: '8333'

// App events - string store_id
{ store_id: '8333' } → storeId: '8333'

// Non-numeric string IDs preserved
{ store_id: 'uk-87262' } → storeId: 'uk-87262'

// Empty/whitespace - undefined
{ store_id: '   ' } → storeId: undefined

// Missing - undefined
{ } → storeId: undefined
```

## Immutability

All output is frozen for safe caching and sharing:

```typescript
const products = normalizeCartEvent(event);

// Array is frozen
Object.isFrozen(products); // true

// Each product is frozen
Object.isFrozen(products[0]); // true

// productIds arrays are frozen
Object.isFrozen(products[0].productIds); // true
```

## API Reference

### `normalizeCartEvent(event, options?)`

Normalizes a raw cart event into an array of CartProduct objects.

**Parameters:**

- `event` (RawCartEvent) - Raw cart event from apps/extensions
- `options.validate` (boolean, default: false) - Enable Zod schema validation
- `options.extractProductIds` (boolean, default: true) - Extract IDs from URLs

**Returns:**

- `readonly CartProduct[]` - Frozen array of normalized products

**Example:**

```typescript
const products = normalizeCartEvent(rawEvent, {
  validate: true,
  extractProductIds: true,
});
```

### Exported Schemas

```typescript
import {
  RawCartEventSchema,
  RawProductSchema,
  CartProductSchema,
} from '@rr/cart-event-normalizer';
```

### Exported Types

```typescript
import type {
  RawCartEvent,
  RawProduct,
  CartProduct,
  NormalizeCartEventOptions,
} from '@rr/cart-event-normalizer';
```

## Testing

Run tests:

```bash
pnpm --filter @rr/cart-event-normalizer test
```

### Test Coverage

The test suite covers:

- Basic normalization for various merchants (MLB Shop, Barnes & Noble, Macy's, etc.)
- Product filtering rules (URL vs title+price requirements)
- Store ID type coercion (string, number, invalid)
- Field mapping completeness
- Product ID extraction integration
- Validation option behavior
- Immutability guarantees
- Edge cases (empty carts, whitespace names, null values)

## Dependencies

- `zod` - Schema validation and type inference
- `@rr/product-id-extractor` - Extract product IDs from URLs
- `@rr/url-parser` - Parse URL components for extraction
- `@rr/store-registry` - Store configuration lookup

## Performance

The normalizer is optimized for high-throughput processing:

- **No validation by default**: Zod validation is opt-in
- **Lazy ID extraction**: Can be disabled if not needed
- **Frozen output**: Single freeze operation, no deep cloning
- **Simple filtering**: O(n) single pass through products

## Examples

### MLB Shop (No Product URLs)

```typescript
const event = {
  store_id: 5806,
  product_list: [
    {
      name: "Men's Yankees Jersey",
      item_price: 14999,
      quantity: 1,
    },
  ],
};

const products = normalizeCartEvent(event);
// [{ title: "Men's Yankees Jersey", storeId: '5806', price: 14999, quantity: 1, productIds: [] }]
```

### Barnes & Noble (Multiple Products with URLs)

```typescript
const event = {
  store_id: 96,
  product_list: [
    {
      name: 'The Creative Act',
      url: 'https://barnesandnoble.com/w/creative-act/1234567890',
      item_price: 1800,
    },
    {
      name: 'Atomic Habits',
      url: 'https://barnesandnoble.com/w/atomic-habits/0987654321',
      item_price: 1349,
    },
  ],
};

const products = normalizeCartEvent(event);
// Products with extracted IDs from URLs
```

### App Event (String store_id)

```typescript
const event = {
  store_id: '8333', // String from mobile app
  application_type: 'App',
  product_list: [
    {
      name: 'Sweater',
      url: 'https://macys.com/product?ID=12345',
      item_price: 4900,
    },
  ],
};

const products = normalizeCartEvent(event);
// storeId is coerced to string: '8333'
```

### Empty Cart

```typescript
const event = {
  store_id: 1234,
  product_list: [],
};

const products = normalizeCartEvent(event);
// Returns: [] (empty frozen array)
```

## Maintenance

When updating:

1. Update schemas in `src/types.ts` for new fields
2. Update `normalizeProduct()` in `src/normalizer.ts` for field mapping
3. Update `isValidProduct()` if validation rules change
4. Add test fixtures for new edge cases
5. Run full test suite: `pnpm --filter @rr/cart-event-normalizer test`
6. Update this README with new examples
