# extractIdsFromUrlComponents

Extract product IDs from URL components using configurable regex patterns with store-specific customization.

## Features

- **Multi-pattern extraction**: Supports both pathname and query parameter patterns
- **Store-specific patterns**: Custom extraction rules for 100+ retailers
- **Pattern prioritization**: Domain-specific patterns override generic patterns
- **ID transformation**: Optional store-specific ID normalization
- **Performance safeguards**: Timeout protection (100ms), result limits (12 IDs)
- **Safe regex**: Validated patterns with no catastrophic backtracking
- **Runtime validation**: Zod schema validation (development mode only)
- **Type safety**: Full TypeScript support with inferred types
- **Optimized for Lambda**: <1ms overhead at 300 RPS

## Installation

```typescript
import { extractIdsFromUrlComponents } from '@/lib/extractIdsFromUrlComponents';
import { parseUrlComponents } from '@/lib/parseUrlComponents';
```

## Usage

### Basic Usage

```typescript
import { extractIdsFromUrlComponents } from '@/lib/extractIdsFromUrlComponents';
import { parseUrlComponents } from '@/lib/parseUrlComponents';

const url = 'https://nike.com/t/air-max-270-mens-shoe/AH8050-001';
const urlComponents = parseUrlComponents(url);
const productIds = extractIdsFromUrlComponents({ urlComponents });
// Returns: ['ah8050-001'] (frozen, sorted array)
```

### With Store ID

```typescript
const productIds = extractIdsFromUrlComponents({
  urlComponents,
  storeId: 'nike.com',
});
```

### Advanced: Pattern Extractor

```typescript
import { patternExtractor } from '@/lib/extractIdsFromUrlComponents';

const ids = patternExtractor({
  source: '/product/p123456789',
  pattern: /p(\d{6,})/g,
});
// Returns: Set(['p123456789', '123456789'])
```

## Extraction Logic

The library follows a 4-stage extraction process:

### 1. Domain-Specific Pathname Patterns (Highest Priority)

If a store configuration exists for the domain, its `pathnamePatterns` are applied first:

```typescript
// Example: Nike-specific pattern
{
  id: '9528',
  domain: 'nike.com',
  pathnamePatterns: [/\/([a-z0-9]{6,16}-[a-z0-9]{3})\b/gi],
}

// URL: https://nike.com/product/abc123-xyz
// Extracted: ['abc123-xyz']
```

**ID Transformation**: Stores can provide a `transformId` function to normalize IDs:

```typescript
{
  id: 'example',
  domain: 'example.com',
  pathnamePatterns: [...],
  transformId: (id) => id.toUpperCase(),
}
```

### 2. Generic Pathname Patterns (Fallback)

If no domain-specific matches are found, generic patterns are applied:

- **Product ID Pattern**: `prod-123456`, `prd-789012`, `p-456789`
- **Numeric End Pattern**: URLs ending in `/123456` or `/123456.html`

```typescript
// Generic patterns match common formats
'https://example.com/product/prod-123456' → ['prod-123456', '123456']
'https://example.com/item/987654.html' → ['987654']
```

### 3. Domain-Specific Search Patterns

If the store has `searchPatterns` defined, they are applied to query parameters:

```typescript
{
  id: 'test-search-patterns',
  domain: 'test-search.example.com',
  searchPatterns: [
    /[?&]productId=([a-z0-9]{6,24})\b/gi,
    /[?&]sku=([a-z0-9-_]{4,24})\b/gi,
  ],
}

// URL: https://test-search.example.com/product?productId=abc123
// Extracted: ['abc123']
```

### 4. Generic Search Patterns (Always Applied)

Generic query parameter patterns are always applied last:

```typescript
// Matches common query parameter names
'?sku=abc123' → ['abc123']
'?pid=xyz789' → ['xyz789']
'?productid=def456' → ['def456']
```

**Supported parameter names**: `sku`, `pid`, `id`, `productid`, `skuid`, `athcpid`, `upc_id`, `variant`, `prdtno`

## Pattern Configuration

### Adding Store-Specific Patterns

Store configurations are defined in `/src/storeConfigs/configs.ts`:

```typescript
import { buildRegExp, capture, repeat, digit, word, wordBoundary } from 'ts-regex-builder';

export const storeConfigs: StoreConfigInterface[] = [
  {
    id: '5246',
    domain: 'target.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, 'a-', capture(repeat(digit, { min: 6, max: 24 })), wordBoundary], {
        global: true,
      }),
    ],
  },
  // ... more stores
];
```

### Pattern Requirements

All patterns must:

- ✅ Have the `global` flag (`/pattern/g`)
- ✅ Use capturing groups `()` for IDs
- ✅ Pass `safe-regex` validation (no ReDoS)
- ✅ Complete execution in < 10ms
- ✅ Use lowercase matching (URLs are normalized)

## Performance

### Optimizations (Phase 1 & Phase 2 Complete)

Optimized for **300 requests per second** on AWS Lambda:

**Phase 1 (commit 011e6de):**

- **Internal pattern extractor**: Eliminates 1200-1800 Zod validations/second by using internal function for known-valid inputs
- **RegExp state reset**: `finally` block ensures `pattern.lastIndex = 0` for reliability
- **Reduced syscalls**: Timeout checks every 5 iterations (80% reduction in `Date.now()` calls)

**Phase 2 (commit d2de29b):**

- **Dev-only Zod validation**: Full validation in development, lightweight checks in production
- **94-98% reduction in validation overhead**
- **Achieved: 0.6ms/second overhead** (was 10.5-27ms)

### Performance Characteristics

- **Regex execution**: < 10ms per pattern (enforced by tests)
- **Timeout protection**: 100ms maximum per pattern
- **Result limit**: 12 IDs maximum per URL
- **585 tests** ensuring correctness across 100+ stores
- **97.91% line coverage**, **97.36% branch coverage**

### Future Optimizations (Phase 3 - Optional)

Additional optimizations available if needed:

- **Console logging optimization**: Replace synchronous console calls with metrics or async logging
- **Memory optimization**: Consider removing `Object.freeze()` if GC pressure detected

These should be driven by production metrics rather than implemented speculatively.

## Security

### Safe Regex

All patterns are validated with `safe-regex` to prevent ReDoS attacks:

```typescript
import safeRegex from 'safe-regex';

test('should only use safe regex patterns', () => {
  regexPatterns.forEach((pattern) => {
    expect(safeRegex(pattern)).toBeTruthy();
  });
});
```

### Input Validation

Development mode validates all inputs with Zod schemas:

```typescript
// Development: Full validation
extractIdsFromUrlComponents({ urlComponents: 'not-an-object' });
// ❌ ZodError: Expected object, received string

// Production: Type-safe, no runtime validation
extractIdsFromUrlComponents({ urlComponents });
// ✓ Trusts upstream validation from parseUrlComponents
```

### Output Validation

Development mode ensures all extracted IDs meet requirements:

```typescript
// Validates in development only
productIdsSchema.parse(results);
// ✓ 1-24 characters
// ✓ Alphanumeric, dashes, underscores only
// ✓ Maximum 12 IDs
```

## API Reference

### `extractIdsFromUrlComponents(input)`

Extracts product IDs from URL components using pattern matching.

**Parameters:**

- `input.urlComponents` (URLComponents) - Parsed URL components from `parseUrlComponents`
- `input.storeId` (string, optional) - Store identifier for store-specific patterns

**Returns:**

- `ReadonlyArray<string>` - Frozen, sorted array of unique product IDs (max 12)

**Validation:**

- Development: Full Zod validation on input and output
- Production: No validation (trusts upstream)

**Example:**

```typescript
const urlComponents = parseUrlComponents('https://nike.com/product/abc-123');
const ids = extractIdsFromUrlComponents({ urlComponents });
// Returns: ['abc-123'] (frozen array)
```

### `patternExtractor(input)`

Public API for extracting IDs using regex patterns. Validates input with Zod.

**Parameters:**

- `input.source` (string) - String to search (max 10,000 characters)
- `input.pattern` (RegExp) - Global regex pattern with capture groups

**Returns:**

- `Set<string>` - Unique matches from capture groups 1 and 2

**Safeguards:**

- Validates pattern is RegExp with global flag (dev mode)
- Enforces timeout (100ms)
- Limits results (12 max)

**Note:** For internal use, `patternExtractorInternal` is used to avoid validation overhead.

## Schemas

### `extractIdsInputSchema`

Validates input to `extractIdsFromUrlComponents`:

```typescript
z.object({
  urlComponents: urlComponentsSchema,
  storeId: z.string().min(1).max(100).optional(),
});
```

### `productIdSchema`

Validates individual product IDs:

```typescript
z.string()
  .min(1, 'Product ID cannot be empty')
  .max(24, 'Product ID cannot exceed 24 characters')
  .regex(/^[\w-]+$/, 'Must be alphanumeric, dashes, or underscores');
```

### `productIdsSchema`

Validates array of product IDs:

```typescript
z.array(productIdSchema).max(12, 'Cannot extract more than 12 product IDs').readonly();
```

## Testing

Run tests:

```bash
npm test extractIdsFromUrlComponents
```

Run with coverage:

```bash
npm run test:coverage
```

### Test Files

- `extractIdsFromUrlComponents.test.ts` - Integration tests and validation
- `extractIdsFromUrlComponents.errorHandling.test.ts` - Error handling, timeouts, edge cases
- `extractIdsFromUrlComponents.searchPatterns.test.ts` - Domain-specific query patterns
- `extractIdsFromUrlComponents.extractFromPath.test.ts` - Pathname pattern matching
- `extractIdsFromUrlComponents.extractFromQueryParams.test.ts` - Query string extraction
- `extractIdsFromUrlComponents.extractFromStoreConfig.test.ts` - Store-specific patterns (100+ stores)
- `extractIdsFromUrlComponents.regex.test.ts` - Pattern validation and safety

## Examples

### Target

```typescript
const url = 'https://www.target.com/p/product-name/-/A-12345678';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['12345678']
```

### Nike

```typescript
const url = 'https://www.nike.com/t/air-max/AH8050-001';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['ah8050-001']
```

### Best Buy

```typescript
const url = 'https://www.bestbuy.com/site/product/6535717.p?skuId=6535717';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['6535717']
```

### Multiple IDs

```typescript
const url = 'https://example.com/product/prod-123456?sku=SKU789012';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['123456', 'sku789012'] (sorted, lowercased)
```

## Error Handling

- Returns empty array on extraction failures
- Logs warnings for timeouts and result limits (dev mode only)
- Logs errors for invalid patterns or processing failures
- Never throws - always returns safe, empty result on error

## Dependencies

- `zod` - Runtime validation (development mode only)
- `ts-regex-builder` - Safe regex pattern construction
- `@/lib/parseUrlComponents` - URL normalization and parsing
- `@/storeConfigs` - Store-specific configuration management

## Maintenance

When updating:

1. Add new patterns to `extractIdsFromUrlComponents.config.ts` or store configs
2. Run full test suite: `npm run check`
3. Verify timeout and result limits are appropriate
4. Update this README with new examples
5. Check performance benchmarks: `npm run test:bench`

## Configuration Reference

### `config.ts`

```typescript
export const config = {
  PATTERNS: {
    pathnamePatterns: [
      productIdPattern, // prod-123456, prd-123456, p123456
      numericEndPattern, // /123456, /123456.html
    ],
    searchPattern, // ?sku=..., ?pid=..., ?productid=...
  },
  MAX_RESULTS: 12, // Maximum IDs to extract
  TIMEOUT_MS: 100, // Maximum time per pattern
};
```

### Supported Query Parameters

- `sku`, `pid`, `id`
- `productid`, `skuid`
- `athcpid`, `upc_id`
- `variant`, `prdtno`

### Pathname Patterns

**Product ID Pattern:**

```
\b(prod|prd|p)-?(\d{6,24})\b
```

Matches: `prod-123456`, `prd123456`, `p-123456`

**Numeric Ending Pattern:**

```
\b[/-](\d{6,24})\.html?$
```

Matches: `/123456`, `/123456.html`, `-123456`
