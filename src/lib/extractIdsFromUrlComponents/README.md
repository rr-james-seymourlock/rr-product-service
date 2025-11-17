# extractIdsFromUrlComponents

A robust product ID extraction library that identifies and extracts product identifiers from e-commerce URLs using configurable regex patterns and store-specific rules.

## Purpose

Extracts product IDs from normalized URL components by analyzing both pathname and query string segments. Supports both generic patterns and store-specific configurations with fallback strategies.

## Features

- **Store-Specific Patterns**: Custom regex patterns for 92+ retailers
- **Generic Fallback Patterns**: Common product ID formats when store-specific patterns don't match
- **ID Transformation**: Store-specific ID normalization (e.g., removing prefixes, checksums)
- **Performance Safeguards**:
  - Timeout protection (100ms default)
  - Result limits (12 IDs max)
  - Safe regex patterns via `ts-regex-builder`
- **Flexible Matching**: Searches both pathname and query parameters
- **Deterministic Output**: Returns frozen, sorted array for consistency

## Installation

This library is internal to the rr-product-service project.

```typescript
import { extractIdsFromUrlComponents } from '@/lib/extractIdsFromUrlComponents';
```

## Usage

### Basic Example

```typescript
import { extractIdsFromUrlComponents } from '@/lib/extractIdsFromUrlComponents';
import { parseUrlComponents } from '@/lib/parseUrlComponents';

const url = 'https://www.nike.com/t/air-max-270-mens-shoe/AH8050-001';
const urlComponents = parseUrlComponents(url);

const ids = extractIdsFromUrlComponents({ urlComponents });
// Returns: ['AH8050-001']
```

### With Store ID

```typescript
const url = 'https://www.gap.com/browse/product.do?pid=123456';
const urlComponents = parseUrlComponents(url);

const ids = extractIdsFromUrlComponents({
  urlComponents,
  storeId: 'gap', // Use store-specific patterns
});
// Returns: ['123456']
```

### Multiple IDs

```typescript
const url = 'https://example.com/product/prod-123456?sku=SKU789012';
const urlComponents = parseUrlComponents(url);

const ids = extractIdsFromUrlComponents({ urlComponents });
// Returns: ['123456', 'SKU789012'] (sorted)
```

## API Reference

### `extractIdsFromUrlComponents(options)`

Extracts product IDs from parsed URL components.

**Parameters:**

- `options.urlComponents` (URLComponents) - Parsed URL components from `parseUrlComponents`
  - `domain` (string) - Normalized domain
  - `pathname` (string) - URL pathname
  - `search` (string) - Query string
  - `href` (string) - Full URL
- `options.storeId` (string, optional) - Store identifier for store-specific pattern matching

**Returns:**

- `ReadonlyArray<string>` - Frozen, sorted array of unique product IDs

**Behavior:**

1. Checks store-specific pathname patterns (if `storeId` provided)
2. Falls back to generic pathname patterns if no matches
3. Applies ID transformation functions (if configured)
4. Checks store-specific query patterns
5. Falls back to generic query patterns
6. Returns sorted, deduplicated results

### `patternExtractor(options)`

Low-level utility for extracting IDs using regex patterns.

**Parameters:**

- `options.source` (string) - String to search
- `options.pattern` (RegExp) - Global regex pattern with capture groups

**Returns:**

- `Set<string>` - Unique matches from capture groups 1 and 2

**Safeguards:**

- Validates pattern is RegExp with global flag (dev mode)
- Enforces timeout (100ms default)
- Limits results (12 max)
- Graceful error handling

## Configuration

### Pattern Configuration (`config.ts`)

```typescript
export const config = {
  PATTERNS: {
    pathnamePatterns: [
      // Product ID patterns (e.g., prod-123456, p123456)
      productIdPattern,
      // Numeric ending patterns (e.g., /123456.html)
      numericEndPattern,
    ],
    searchPattern, // Query parameter pattern (?sku=..., ?pid=...)
  },
  MAX_RESULTS: 12,
  TIMEOUT_MS: 100,
};
```

### Supported Query Parameters

The library automatically detects these query parameter names:

- `sku`, `pid`, `id`
- `productid`, `skuid`
- `athcpid`, `upc_id`
- `variant`, `prdtno`

### Pathname Patterns

**Product ID Pattern:**

```
prod-123456, prd123456, p-123456
```

Matches: `\b(prod|prd|p)-?(\d{6,24})\b`

**Numeric Ending Pattern:**

```
/123456, /123456.html, -123456
```

Matches: `\b[/-](\d{6,24})\.html?$`

## Store-Specific Configuration

Store configurations are loaded from `@/storeConfigs`. Each store can define:

- **`pathnamePatterns`**: Custom regex patterns for URL paths
- **`searchPatterns`**: Custom regex patterns for query strings
- **`transformId`**: Function to normalize extracted IDs

See `storeConfigs` library for details on configuring stores.

## Performance

- **Regex Safety**: All patterns built with `ts-regex-builder` to prevent catastrophic backtracking
- **Timeout Protection**: Pattern extraction stops after 100ms
- **Result Limits**: Returns maximum 12 IDs per URL
- **Benchmarks**: See `__tests__/regex.bench.ts` for performance tests

## Testing

```bash
npm test -- extractIdsFromUrlComponents
```

**Test Coverage:**

- `extractFromPath.test.ts` - Pathname pattern matching
- `extractFromQueryParams.test.ts` - Query string extraction
- `extractFromStoreConfig.test.ts` - Store-specific patterns (92 stores)
- `extractIdsFromUrlComponents.test.ts` - Integration tests
- `regex.test.ts` - Pattern validation
- `regex.bench.ts` - Performance benchmarks

## Examples

### Target

```typescript
const url = 'https://www.target.com/p/product-name/-/A-12345678';
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['12345678']
```

### Nike

```typescript
const url = 'https://www.nike.com/t/air-max/AH8050-001';
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['AH8050-001']
```

### Best Buy

```typescript
const url = 'https://www.bestbuy.com/site/product/6535717.p?skuId=6535717';
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['6535717']
```

## Dependencies

- `ts-regex-builder` - Safe regex pattern construction
- `@/parseUrlComponents` - URL normalization and parsing
- `@/storeConfigs` - Store-specific configuration management

## Error Handling

- Returns empty array on extraction failures
- Logs warnings for timeouts and result limits (dev mode)
- Logs errors for invalid patterns or processing failures
- Never throws - always returns safe, empty result on error

## Maintenance

This library is a standalone component designed for independent maintenance and versioning. When updating:

1. Add new patterns to `config.ts` or store configs
2. Run full test suite including benchmarks
3. Verify timeout and result limits are appropriate
4. Update this README with new examples

## Future Enhancements

- Database-backed store configurations
- Machine learning pattern detection
- Confidence scoring for extracted IDs
- Support for multi-product URLs
