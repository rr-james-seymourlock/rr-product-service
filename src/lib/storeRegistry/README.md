# storeRegistry

Store configuration management system that handles store identification, domain mapping, and URL pattern matching for multi-store environments.

## Features

- **Fast O(1) lookups**: Map-based storage for constant-time retrieval
- **Dual lookup modes**: Find stores by ID or domain name
- **Alias support**: Multiple domains/IDs can map to the same store
- **Pre-compiled patterns**: Zero overhead for regex pattern access
- **100+ store configurations**: Support for major retailers
- **Type-safe**: Full TypeScript support with Zod validation
- **Immutable**: ReadonlyMap and readonly interfaces prevent accidental mutations
- **Performance optimized**: <0.01ms per lookup on average

## Installation

```typescript
import { getStoreConfig } from '@/lib/storeRegistry';
```

## Usage

### Basic Store Lookup by ID

```typescript
import { getStoreConfig } from '@/lib/storeRegistry';

const config = getStoreConfig({ id: '5246' });
// Returns: { id: '5246', domain: 'target.com', pathnamePatterns: [...] }
```

### Lookup by Domain

```typescript
const config = getStoreConfig({ domain: 'nike.com' });
// Returns: { id: '9528', domain: 'nike.com', pathnamePatterns: [...] }
```

### Accessing Store Patterns

```typescript
import { COMPILED_PATTERNS } from '@/lib/storeRegistry';

const targetPatterns = COMPILED_PATTERNS.get('5246');
// Returns: [RegExp, RegExp, ...] or undefined if no patterns
```

### Direct Map Access

```typescript
import { STORE_ID_CONFIG, STORE_NAME_CONFIG } from '@/lib/storeRegistry';

// Get store config directly from ID map
const config = STORE_ID_CONFIG.get('5246');

// Get store ID from domain
const storeId = STORE_NAME_CONFIG.get('target.com');
// Returns: '5246'
```

## Store Configuration Structure

### StoreConfigInterface

```typescript
interface StoreConfigInterface {
  readonly id: string; // Unique store identifier
  readonly domain: string; // Primary domain (e.g., 'nike.com')
  readonly aliases?: ReadonlyArray<{
    // Alternative domains/IDs
    readonly id: string;
    readonly domain: string;
  }>;
  readonly patternFormats?: string[]; // Example ID formats for documentation
  readonly pathnamePatterns?: RegExp[]; // URL path matching patterns
  readonly searchPatterns?: RegExp[]; // Query parameter matching patterns
  readonly transformId?: (id: string) => string; // Optional ID transformation function
}
```

### Example Configuration

```typescript
{
  id: '5246',
  domain: 'target.com',
  pathnamePatterns: [
    /\ba-(\d{6,24})\b/gi  // Matches: /A-12345678
  ],
  aliases: [
    { id: '5246-ca', domain: 'target.ca' }
  ],
  transformId: (id) => id.toLowerCase()
}
```

## API Reference

### `getStoreConfig(identifier)`

Retrieves store configuration based on either store ID or domain name.

**Parameters:**

- `identifier.id` (string, optional) - Store identifier for direct lookup
- `identifier.domain` (string, optional) - Domain name for domain-based lookup

**Returns:**

- `StoreConfigInterface | undefined` - Store configuration if found, undefined otherwise

**Lookup Priority:**

1. If `id` is provided, ID lookup is performed (fast path)
2. If only `domain` is provided, domain lookup is performed
3. If both provided, ID takes precedence
4. If neither provided, returns undefined

**Performance:**

- ID lookup: O(1) - Single Map access
- Domain lookup: O(1) - Two Map accesses (domain → ID → config)

**Examples:**

```typescript
// ID lookup (fastest)
const config1 = getStoreConfig({ id: '5246' });

// Domain lookup
const config2 = getStoreConfig({ domain: 'target.com' });

// Both provided (ID takes precedence)
const config3 = getStoreConfig({ id: '5246', domain: 'nike.com' });
// Returns Target config (ID '5246'), not Nike

// No match
const config4 = getStoreConfig({ id: 'non-existent' });
// Returns: undefined
```

### `STORE_ID_CONFIG`

ReadonlyMap of store IDs to their complete configuration objects.

**Type:** `ReadonlyMap<string, StoreConfigInterface>`

**Contains:**

- All primary store IDs
- All alias IDs (pointing to their parent store config)

**Example:**

```typescript
import { STORE_ID_CONFIG } from '@/lib/storeRegistry';

// Check if store exists
if (STORE_ID_CONFIG.has('5246')) {
  const config = STORE_ID_CONFIG.get('5246');
  console.log(config.domain); // 'target.com'
}

// Get all store IDs
const allStoreIds = Array.from(STORE_ID_CONFIG.keys());
```

### `STORE_NAME_CONFIG`

ReadonlyMap of domain names to their corresponding store IDs.

**Type:** `ReadonlyMap<string, string>`

**Contains:**

- All primary domains → primary store IDs
- All alias domains → alias IDs

**Example:**

```typescript
import { STORE_NAME_CONFIG } from '@/lib/storeRegistry';

// Get store ID from domain
const storeId = STORE_NAME_CONFIG.get('nike.com');
// Returns: '9528'

// Check if domain is registered
if (STORE_NAME_CONFIG.has('target.com')) {
  const id = STORE_NAME_CONFIG.get('target.com');
  console.log(id); // '5246'
}

// Get all registered domains
const allDomains = Array.from(STORE_NAME_CONFIG.keys());
```

### `COMPILED_PATTERNS`

ReadonlyMap of pre-compiled regular expressions for URL pattern matching, indexed by store ID.

**Type:** `ReadonlyMap<string, ReadonlyArray<RegExp>>`

**Contains:**

- Only stores that have `pathnamePatterns` defined
- Pre-compiled RegExp patterns (no runtime compilation overhead)

**Example:**

```typescript
import { COMPILED_PATTERNS } from '@/lib/storeRegistry';

// Get patterns for a store
const targetPatterns = COMPILED_PATTERNS.get('5246');
if (targetPatterns) {
  const pathname = '/p/product-name/-/A-12345678';
  targetPatterns.forEach((pattern) => {
    const matches = pathname.match(pattern);
    if (matches) {
      console.log('Matched:', matches);
    }
  });
}

// Check if store has patterns
const hasPatterns = COMPILED_PATTERNS.has('5246');
```

## Schemas

### `storeAliasSchema`

Validates store alias configuration.

```typescript
import { storeAliasSchema } from '@/lib/storeRegistry';

const alias = storeAliasSchema.parse({
  id: 'nike-uk',
  domain: 'nike.co.uk',
});
```

### `storeConfigSchema`

Validates complete store configuration.

```typescript
import { storeConfigSchema } from '@/lib/storeRegistry';

const config = storeConfigSchema.parse({
  id: '9528',
  domain: 'nike.com',
  pathnamePatterns: [/test/g],
});
```

### `storeIdentifierSchema`

Validates store identifier input for `getStoreConfig`.

```typescript
import { storeIdentifierSchema } from '@/lib/storeRegistry';

const identifier = storeIdentifierSchema.parse({
  id: '5246',
  domain: 'target.com',
});
```

### `storeConfigsSchema`

Validates array of store configurations.

```typescript
import { storeConfigsSchema } from '@/lib/storeRegistry';

const configs = storeConfigsSchema.parse([
  { id: '5246', domain: 'target.com' },
  { id: '9528', domain: 'nike.com' },
]);
```

## Performance

### Optimizations

**Module-level Compilation:**

- Maps are built once at module load time
- Zero per-request overhead for pattern access
- Pre-compiled RegExp patterns

**O(1) Lookups:**

- ID lookup: Single Map.get() operation
- Domain lookup: Two Map.get() operations (domain→ID, ID→config)

**Benchmarks:**

```typescript
// ID lookup: ~0.005ms average (1000 iterations)
for (let i = 0; i < 1000; i++) {
  getStoreConfig({ id: '5246' });
}

// Domain lookup: ~0.01ms average (1000 iterations)
for (let i = 0; i < 1000; i++) {
  getStoreConfig({ domain: 'target.com' });
}
```

**Memory Characteristics:**

- ReadonlyMap ensures immutability
- Shared references (aliases point to same config object)
- No memory overhead for pattern compilation

## Adding New Stores

To add a new store configuration:

1. Open `src/lib/storeRegistry/storeRegistry.config.ts`
2. Add new configuration to `storeConfigs` array:

```typescript
import { buildRegExp, capture, repeat, digit, wordBoundary } from 'ts-regex-builder';

export const storeConfigs: StoreConfigInterface[] = [
  // ... existing stores
  {
    id: '12345',
    domain: 'newstore.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, 'prod-', capture(repeat(digit, { min: 6 }))], { global: true }),
    ],
    aliases: [{ id: '12345-uk', domain: 'newstore.co.uk' }],
  },
];
```

3. Run tests to verify:

```bash
npm test storeRegistry
npm run typecheck
```

## Pattern Building

Use `ts-regex-builder` for safe, readable regex patterns:

```typescript
import {
  buildRegExp,
  capture,
  repeat,
  digit,
  word,
  wordBoundary,
  choiceOf,
} from 'ts-regex-builder';

// Match product IDs like: /p/A-12345678
const pattern = buildRegExp(
  [wordBoundary, 'a-', capture(repeat(digit, { min: 6, max: 24 })), wordBoundary],
  { global: true },
);

// Match alphanumeric IDs: ABC123.html
const pattern2 = buildRegExp(
  [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
  { global: true },
);
```

## Aliases

Aliases allow multiple domains or IDs to map to the same store configuration:

```typescript
{
  id: '9528',
  domain: 'nike.com',
  aliases: [
    { id: '9528-uk', domain: 'nike.co.uk' },
    { id: '9528-ca', domain: 'nike.ca' }
  ]
}
```

**Lookup behavior:**

```typescript
getStoreConfig({ domain: 'nike.com' }); // Returns main config
getStoreConfig({ domain: 'nike.co.uk' }); // Returns same config
getStoreConfig({ id: '9528' }); // Returns main config
getStoreConfig({ id: '9528-uk' }); // Returns same config
```

**Map storage:**

- `STORE_ID_CONFIG`: Contains entries for '9528', '9528-uk', '9528-ca' (all point to same object)
- `STORE_NAME_CONFIG`: Contains 'nike.com'→'9528', 'nike.co.uk'→'9528-uk', 'nike.ca'→'9528-ca'

## Testing

Run tests:

```bash
npm test storeRegistry
```

Run with coverage:

```bash
npm run test:coverage
```

### Test Coverage

- **60 tests** across 2 test files
- Coverage: 100% lines, 100% branches, 100% functions
- Tests include:
  - Store lookup (ID and domain)
  - Alias resolution
  - Map structure validation
  - Performance benchmarks
  - Schema validation
  - Edge cases

### Test Files

- `storeRegistry.test.ts` - Core functionality and integration tests
- `storeRegistry.schema.test.ts` - Zod schema validation tests

## Dependencies

- `zod` - Runtime validation
- `ts-regex-builder` - Safe regex pattern construction

## Common Use Cases

### 1. URL Pattern Extraction

```typescript
import { getStoreConfig } from '@/lib/storeRegistry';

const config = getStoreConfig({ domain: 'target.com' });
if (config?.pathnamePatterns) {
  const url = '/p/product/-/A-12345678';
  config.pathnamePatterns.forEach((pattern) => {
    const match = pattern.exec(url);
    if (match) {
      console.log('Extracted ID:', match[1]); // '12345678'
    }
  });
}
```

### 2. Store Validation

```typescript
import { STORE_NAME_CONFIG } from '@/lib/storeRegistry';

function isValidStore(domain: string): boolean {
  return STORE_NAME_CONFIG.has(domain);
}

isValidStore('target.com'); // true
isValidStore('unknown.com'); // false
```

### 3. Bulk Operations

```typescript
import { STORE_ID_CONFIG } from '@/lib/storeRegistry';

// Process all stores
STORE_ID_CONFIG.forEach((config, id) => {
  console.log(`Store ${id}: ${config.domain}`);
});

// Filter stores with patterns
const storesWithPatterns = Array.from(STORE_ID_CONFIG.entries()).filter(
  ([_id, config]) => config.pathnamePatterns !== undefined,
);
```

### 4. ID Transformation

```typescript
const config = getStoreConfig({ id: '9528' });
if (config?.transformId) {
  const rawId = 'ABC-123';
  const transformedId = config.transformId(rawId);
  console.log(transformedId); // e.g., 'abc-123'
}
```

## Maintenance

When updating configurations:

1. Update `storeConfigs` array in `storeRegistry.config.ts`
2. Run tests: `npm test storeRegistry`
3. Run typecheck: `npm run typecheck`
4. Verify no duplicate IDs (unless intentional - last entry wins)
5. Update README with new examples if needed

## Known Limitations

- **Duplicate IDs**: If multiple stores share the same ID, the last entry in the array wins (Map behavior)
- **No runtime validation in production**: Store configs are not validated at runtime in production mode for performance
- **Immutable patterns**: RegExp patterns cannot be modified after module load
- **Single domain per store**: Primary stores have one domain; use aliases for additional domains

## Migration Guide

If migrating from `storeConfigs` to `storeRegistry`:

1. Update imports:

```typescript
// Before
import { getStoreConfig } from '@/storeConfigs';

// After
import { getStoreConfig } from '@/lib/storeRegistry';
```

2. API remains the same - no code changes needed
3. Run tests to verify: `npm run check`
