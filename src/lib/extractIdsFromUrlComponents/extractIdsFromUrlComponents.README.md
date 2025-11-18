# extractIdsFromUrlComponents

Extract product IDs from URL components using configurable regex patterns with store-specific customization.

## Features

- **Multi-pattern extraction**: Supports both pathname and query parameter patterns
- **Store-specific patterns**: Custom extraction rules for 100+ retailers
- **Pattern prioritization**: Domain-specific patterns override generic patterns
- **ID transformation**: Optional store-specific ID normalization
- **Performance safeguards**: Timeout protection (100ms), result limits (12 IDs)
- **Safe regex**: Validated patterns with no catastrophic backtracking
- **Runtime validation**: Zod schema validation for inputs and outputs
- **Type safety**: Full TypeScript support with inferred types

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

- **Regex execution**: < 10ms per pattern (enforced by tests)
- **Timeout protection**: 100ms maximum per pattern
- **Result limit**: 12 IDs maximum per URL
- **409 tests** ensuring correctness across 100+ stores
- **97.91% line coverage**, **97.36% branch coverage**

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

Zod schemas validate all inputs at runtime:

```typescript
// Invalid inputs throw ZodError
extractIdsFromUrlComponents({ urlComponents: 'not-an-object' });
// ❌ ZodError: Expected object, received string

extractIdsFromUrlComponents({ urlComponents: {...}, storeId: '' });
// ❌ ZodError: Store ID cannot be empty
```

### Output Validation

Results are validated before returning:

```typescript
// Ensures all IDs meet requirements
productIdsSchema.parse(results);
// ✓ 4-24 characters
// ✓ Alphanumeric, dashes, underscores only
// ✓ Maximum 12 IDs
```

## Error Handling

### Graceful Failures

All errors are caught and logged, returning empty arrays:

```typescript
try {
  // Extraction logic
} catch (error) {
  console.error(`Error processing URL ${href}: ${error.message}`);
}
return []; // Empty array on error
```

### Development Warnings

In development mode, additional validations provide helpful warnings:

```typescript
// Non-RegExp pattern
patternExtractor({ source: 'test', pattern: 'not-a-regex' });
// ⚠️  Warning: pattern must be a RegExp object. Returning empty set.

// Missing global flag
patternExtractor({ source: 'test', pattern: /test/ });
// ⚠️  Warning: RegExp pattern '/test/' must have global flag (/g)

// Result limit reached
// ⚠️  Warning: Reached maximum results limit of 12

// Timeout exceeded
// ⚠️  Warning: Pattern extraction timed out after 101ms
```

## Type Safety

### Inferred Types

Types are inferred from Zod schemas:

```typescript
import type { ExtractIdsInput, ProductIds, ProductId } from '@/lib/extractIdsFromUrlComponents';

// ExtractIdsInput = { urlComponents: URLComponents; storeId?: string }
// ProductIds = readonly string[]
// ProductId = string (4-24 chars, alphanumeric + dashes/underscores)
```

### Schema Exports

All schemas are exported for advanced usage:

```typescript
import {
  extractIdsInputSchema,
  productIdsSchema,
  productIdSchema,
  patternExtractorInputSchema,
} from '@/lib/extractIdsFromUrlComponents';

// Validate custom input
const result = extractIdsInputSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.issues);
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test -- src/lib/extractIdsFromUrlComponents

# Run with coverage
npm test -- --coverage src/lib/extractIdsFromUrlComponents

# Run specific test file
npm test -- src/lib/extractIdsFromUrlComponents/__tests__/extractIdsFromUrlComponents.searchPatterns.test.ts
```

### Test Structure

```
__tests__/
├── extractIdsFromUrlComponents.test.ts              # Integration tests (6 tests)
├── extractIdsFromUrlComponents.errorHandling.test.ts # Error handling (8 tests)
├── extractIdsFromUrlComponents.searchPatterns.test.ts # Search patterns (9 tests)
├── extractIdsFromUrlComponents.extractFromPath.test.ts # Path extraction (17 tests)
├── extractIdsFromUrlComponents.extractFromQueryParams.test.ts # Query params (11 tests)
├── extractIdsFromUrlComponents.extractFromStoreConfig.test.ts # Store fixtures (351 tests)
├── extractIdsFromUrlComponents.regex.test.ts        # Regex safety (7 tests)
└── testUtilities.ts                                  # Shared helpers
```

### Coverage Report

```
File                           | % Lines | % Branch | % Funcs |
-------------------------------|---------|----------|---------|
extractIdsFromUrlComponents.ts | 97.91%  | 97.36%   | 100%    |
```

## Examples

### Target (a- Pattern)

```typescript
const url = 'https://www.target.com/p/product-name/-/a-123456789';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['123456789']
```

### Nike (SKU-XXX Pattern)

```typescript
const url = 'https://nike.com/t/air-max-270/ah8050-001';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['ah8050-001']
```

### Generic Fallback

```typescript
const url = 'https://unknown-store.com/product/prod-987654321';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['prod-987654321', '987654321']
```

### Query Parameters

```typescript
const url = 'https://example.com/product?sku=abc-123&pid=xyz-789';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['abc-123', 'xyz-789']
```

### Mixed Extraction

```typescript
const url = 'https://example.com/product/prod-111111?sku=222222';
const urlComponents = parseUrlComponents(url);
const ids = extractIdsFromUrlComponents({ urlComponents });
// ['prod-111111', '111111', '222222']
```

## API Reference

### `extractIdsFromUrlComponents(input: unknown): ProductIds`

Main extraction function.

**Parameters:**

- `input.urlComponents` - URL components from `parseUrlComponents()`
- `input.storeId` - Optional store ID for domain-specific patterns

**Returns:** `ProductIds` - Frozen, sorted array of product IDs (max 12)

**Throws:** `ZodError` - If input or output validation fails

### `patternExtractor(input: unknown): Set<string>`

Low-level pattern extraction utility.

**Parameters:**

- `input.source` - String to extract IDs from
- `input.pattern` - RegExp pattern with global flag

**Returns:** `Set<string>` - Set of extracted IDs

**Throws:** `ZodError` - If input validation fails

## Related

- [`parseUrlComponents`](../parseUrlComponents/parseUrlComponents.README.md) - URL normalization and parsing
- [`/src/storeConfigs`](/src/storeConfigs/README.md) - Store configuration management
- [`/docs/ZOD_STRATEGY.md`](/docs/ZOD_STRATEGY.md) - Zod integration strategy

## Contributing

When adding new store patterns:

1. Add store config to `/src/storeConfigs/configs.ts`
2. Create fixture file in `__fixtures__/[domain].json`
3. Verify pattern safety with `npm test -- extractIdsFromUrlComponents.regex.test.ts`
4. Ensure coverage remains above 95%

## License

Internal use only - Rakuten Rewards
