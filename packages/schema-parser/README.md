# @rr/schema-parser

Parse schema.org JSON-LD Product markup to extract SKUs and product metadata from e-commerce web pages.

## Overview

### What it does

The schema parser extracts structured product information from schema.org JSON-LD markup embedded in HTML pages. It validates Product schemas, recursively extracts all SKUs from complex product hierarchies (ProductGroups, variants, offers), and normalizes product metadata (name, brand, model, description).

### Why it exists

Many e-commerce sites embed rich product metadata using schema.org JSON-LD markup in `<script type="application/ld+json">` tags. This markup is:

- **More reliable than URL patterns** - SKUs are explicitly declared, not inferred from URL structure
- **Comprehensive** - Includes brand, model, variants, and offers in one place
- **Standardized** - Follows schema.org Product specification
- **Already present** - No additional API calls or scraping needed

The parser handles complex real-world scenarios:
- **ProductGroups** with multiple variants (e.g., different colors/sizes)
- **Nested offers** (different SKUs for different sellers/conditions)
- **Product hierarchies** (parent products with variant children)
- **Multiple SKUs per product** (model SKU + color SKUs + size SKUs)

Instead of only relying on URL pattern matching, this package provides an additional data source that can:
- Validate SKUs extracted from URLs
- Find additional variant SKUs not in the URL
- Extract rich product metadata (brand, model, description)
- Handle products with no ID in the URL

### Where it's used

**Current status:** The schema parser is fully implemented but not yet integrated into the product service handlers. It exists as a standalone package ready for future integration.

**Planned usage:**
```
HTML page fetched → Extract JSON-LD → parseProductSchema → Additional SKUs + metadata
                                      (@rr/schema-parser)
                                             ↓
                                      Combined with URL-based extraction
                                      for comprehensive product data
```

**Future integration points:**
- Fetch product page HTML after URL analysis
- Extract and validate schema.org Product markup
- Combine schema-based SKUs with URL-extracted IDs
- Enrich product data with brand, model, description

### When to use it

Use this package when you need to:
- Parse schema.org JSON-LD Product markup from HTML
- Extract SKUs from complex product hierarchies (variants, offers)
- Validate that an object is a valid schema.org Product
- Recursively find all SKUs in nested product structures
- Extract product metadata (name, brand, model, description)

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

- **Schema validation** - Type-safe validation using `schema-dts` TypeScript definitions
- **Recursive extraction** - Finds SKUs in deeply nested product structures
- **Variant support** - Handles ProductGroups, hasVariant, isVariantOf relationships
- **Offer extraction** - Extracts SKUs from offers (different sellers/conditions)
- **Circular reference protection** - Prevents infinite loops in recursive structures
- **Deduplication** - Returns unique SKUs even if repeated in structure
- **Type safety** - Full TypeScript support with schema-dts types
- **Custom error classes** - Type-safe error handling
- **Structured logging** - JSON-formatted logs for debugging

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { parseProductSchema, extractSkusFromSchema, isValidProductSchema } from '@rr/schema-parser';
```

## Usage

### Basic Example

```typescript
import { parseProductSchema } from '@rr/schema-parser';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Nike Air Max 270',
  brand: 'Nike',
  sku: 'AH8050-001',
  offers: {
    '@type': 'Offer',
    price: '150.00',
    priceCurrency: 'USD',
  },
};

const product = parseProductSchema(jsonLd);
// Returns: WithContext<Product> with extracted data
```

### Extract SKUs Only

```typescript
import { extractSkusFromSchema } from '@rr/schema-parser';

const jsonLd = {
  '@type': 'Product',
  sku: 'MAIN-SKU',
  hasVariant: [
    { '@type': 'Product', sku: 'VARIANT-1' },
    { '@type': 'Product', sku: 'VARIANT-2' },
  ],
};

const skus = extractSkusFromSchema(jsonLd);
// Returns: ['MAIN-SKU', 'VARIANT-1', 'VARIANT-2']
```

### Validate Schema

```typescript
import { isValidProductSchema } from '@rr/schema-parser';

const jsonLd = { '@type': 'Product', name: 'Test Product' };

if (isValidProductSchema(jsonLd)) {
  // Safe to parse as Product
  const product = parseProductSchema(jsonLd);
}
```

## API Reference

### `parseProductSchema(schema)`

Parses and validates a schema.org Product object, extracting metadata and SKUs.

**Parameters:**
- `schema` (unknown) - Object to parse (validated at runtime)

**Returns:**
- `WithContext<Product> | undefined` - Parsed product schema or undefined if invalid

**Behavior:**
- Validates schema structure
- Extracts name, brand, model, sku, description
- Recursively extracts all SKUs (stored in `skus` field)
- Returns undefined for invalid schemas (no errors thrown)

**Example:**

```typescript
const product = parseProductSchema({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Air Max',
  brand: { '@type': 'Brand', name: 'Nike' },
  sku: 'AH8050-001',
});

// product.name: 'Air Max'
// product.brand: 'Nike' (extracted from Brand object)
// product.sku: 'AH8050-001'
// product.skus: ['AH8050-001'] (recursive extraction)
```

### `extractSkusFromSchema(schema)`

Recursively extracts all SKUs from a Product, ProductGroup, or related structure.

**Parameters:**
- `schema` (Product | Record<string, unknown>) - Schema to extract from

**Returns:**
- `string[]` - Deduplicated array of all SKUs found

**Supports:**
- Direct `sku` fields (string or array)
- `offers` (Offer or array of Offers)
- `hasVariant` (ProductGroup variants)
- `isVariantOf` (Product/ProductModel relationships)
- `model` (ProductModel structures)
- Circular reference protection
- Deeply nested structures

**Examples:**

```typescript
// Simple product
extractSkusFromSchema({ sku: 'ABC123' });
// ['ABC123']

// Product with variants
extractSkusFromSchema({
  sku: 'PARENT',
  hasVariant: [
    { sku: 'CHILD-1' },
    { sku: 'CHILD-2' },
  ],
});
// ['PARENT', 'CHILD-1', 'CHILD-2']

// Product with multiple offers
extractSkusFromSchema({
  sku: 'MAIN',
  offers: [
    { sku: 'OFFER-1' },
    { sku: 'OFFER-2' },
  ],
});
// ['MAIN', 'OFFER-1', 'OFFER-2']
```

### `isValidProductSchema(schema)`

Validates that an object conforms to the schema.org Product type.

**Parameters:**
- `schema` (unknown) - Object to validate

**Returns:**
- `boolean` - True if valid Product schema, false otherwise

**Validation:**
- Checks for object type
- Requires `@type` field
- `@type` must be 'Product' or include 'Product' (supports multi-type arrays)

**Examples:**

```typescript
isValidProductSchema({ '@type': 'Product' }); // true
isValidProductSchema({ '@type': 'Organization' }); // false
isValidProductSchema({ '@type': ['Product', 'Thing'] }); // true (multi-type)
isValidProductSchema('not an object'); // false
isValidProductSchema(null); // false
```

## Real-World Examples

### ProductGroup with Variants

```typescript
const productGroup = {
  '@type': 'ProductGroup',
  name: 'Nike Air Max 270',
  sku: 'AH8050',
  hasVariant: [
    {
      '@type': 'Product',
      name: 'Nike Air Max 270 - Black',
      sku: 'AH8050-001',
      offers: { '@type': 'Offer', price: '150' },
    },
    {
      '@type': 'Product',
      name: 'Nike Air Max 270 - White',
      sku: 'AH8050-100',
      offers: { '@type': 'Offer', price: '150' },
    },
  ],
};

const skus = extractSkusFromSchema(productGroup);
// ['AH8050', 'AH8050-001', 'AH8050-100']
```

### Multiple Offers (Different Sellers)

```typescript
const product = {
  '@type': 'Product',
  name: 'iPhone 15 Pro',
  sku: 'IPHONE-15-PRO',
  offers: [
    {
      '@type': 'Offer',
      seller: { name: 'Apple' },
      sku: 'APPLE-SKU',
    },
    {
      '@type': 'Offer',
      seller: { name: 'BestBuy' },
      sku: 'BESTBUY-SKU',
    },
  ],
};

const skus = extractSkusFromSchema(product);
// ['IPHONE-15-PRO', 'APPLE-SKU', 'BESTBUY-SKU']
```

### Brand Object Extraction

```typescript
const product = parseProductSchema({
  '@type': 'Product',
  name: 'Air Max 270',
  brand: {
    '@type': 'Brand',
    name: 'Nike',
  },
  sku: 'AH8050-001',
});

console.log(product?.brand); // 'Nike' (extracted from Brand object)
```

## Error Handling

The library exports custom error classes for type-safe error handling:

```typescript
import {
  parseProductSchema,
  InvalidInputStructureError,
  SchemaValidationError,
} from '@rr/schema-parser';
```

### Custom Error Classes

#### `InvalidInputStructureError`

Thrown when input structure is invalid (not an object, missing required fields).

```typescript
class InvalidInputStructureError extends Error {
  constructor(message?: string)
}
```

#### `SchemaValidationError`

Thrown when schema validation fails (invalid @type, malformed structure).

```typescript
class SchemaValidationError extends Error {
  constructor(message?: string)
}
```

**Note:** `parseProductSchema()` returns `undefined` instead of throwing errors for graceful failure handling. Error classes are exported for consistency and future use.

## Logging

The library includes structured JSON logging for debugging and observability.

### Default Logger

```typescript
import { logger } from '@rr/schema-parser';

// Logger outputs JSON to stdout/stderr
// Automatically suppressed in test environment (NODE_ENV=test)
```

### Custom Logger Instances

Create namespaced loggers for different contexts:

```typescript
import { createLogger } from '@rr/schema-parser';

const customLogger = createLogger('my-service.schema-parsing');

customLogger.debug({ schemaType: 'Product' }, 'Validating schema');
customLogger.info({ skuCount: 5 }, 'Extracted SKUs');
```

### Log Output

`parseProductSchema()` logs debug information:

```json
{
  "level": "debug",
  "message": "Parsed product schema",
  "context": {
    "name": "Nike Air Max 270",
    "brand": "Nike",
    "skuCount": 3,
    "namespace": "schema-parser.parser"
  },
  "timestamp": "2025-11-24T23:07:56.017Z"
}
```

## Testing

```bash
# Run all tests
pnpm --filter @rr/schema-parser test

# Run tests in watch mode
pnpm --filter @rr/schema-parser test:watch
```

**Test Coverage:** Comprehensive test suites covering:
- `extract-skus.test.ts` - SKU extraction from various structures
- `is-valid-schema.test.ts` - Schema validation logic

## TypeScript Support

Full TypeScript support using `schema-dts` for schema.org types:

```typescript
import type { Product, ProductGroup, WithContext } from 'schema-dts';
import { parseProductSchema } from '@rr/schema-parser';

// Type-safe parsing
const product: WithContext<Product> | undefined = parseProductSchema(data);

// Access with full type safety
if (product) {
  console.log(product.name); // string | string[] | undefined
  console.log(product.brand); // Brand | Organization | string | undefined
}
```

## Dependencies

- `schema-dts` - TypeScript definitions for schema.org types
- `zod` - Runtime validation (via @rr/shared)
- `@rr/shared` - Shared utilities (logger)

## Future Integration

**Planned usage in product-service:**

1. **Fetch product page** after URL analysis
2. **Extract JSON-LD** from `<script type="application/ld+json">` tags
3. **Parse and validate** schema using `parseProductSchema()`
4. **Combine data sources:**
   - URL-extracted IDs (fast, always available)
   - Schema-extracted SKUs (comprehensive, when available)
5. **Enrich response** with brand, model, description metadata

**Benefits:**
- More reliable SKU extraction (explicit vs. inferred)
- Additional variant SKUs not in URL
- Rich product metadata for downstream services
- Validation of URL-extracted IDs

## Use Cases

1. **Variant discovery** - Find all color/size SKUs for a product
2. **Multi-seller products** - Extract SKUs from different offers
3. **Product validation** - Verify URL-extracted IDs against schema
4. **Metadata extraction** - Get brand, model, description for analytics
5. **Fallback extraction** - When URL patterns don't match, use schema

## Maintenance

This package is standalone and ready for integration. When updating:

1. Add support for new schema.org types (e.g., `ProductCollection`)
2. Extend validation in `isValidProductSchema()`
3. Add new extraction paths in `extractSkusFromSchema()` (e.g., `additionalProperty`)
4. Run tests to verify changes
5. Update this README with new examples
