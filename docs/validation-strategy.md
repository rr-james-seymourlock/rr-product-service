# Validation Strategy

**Goal:** Maximize reliability while optimizing for 300 RPS on AWS Lambda

## Validation Levels

### 1. TypeScript (Build-time Only)

**Cost:** Zero runtime overhead
**Coverage:** Catches type errors during development

```typescript
// Internal function with TypeScript-only validation
function processData(data: ProcessedData): Result {
  // TypeScript ensures data has correct shape
  return data.value.toUpperCase();
}
```

**When to use:**

- ✅ Internal function calls within the same module
- ✅ Data transformations where input source is trusted
- ✅ Helper functions called from validated entry points
- ✅ Functions that only manipulate data structure (no external input)

**When NOT to use:**

- ❌ Public API entry points
- ❌ Data from external sources (HTTP requests, databases, files)
- ❌ User-provided input
- ❌ Configuration files

---

### 2. Zod Runtime Validation (Production)

**Cost:** ~1-10μs per validation (depends on schema complexity)
**Coverage:** Validates actual runtime data with detailed error messages

```typescript
const userInputSchema = z.object({
  url: z.string().url(),
  options: z.object({ timeout: z.number() }).optional(),
});

export function parseUrl(input: unknown) {
  // Validate external input at API boundary
  const { url, options } = userInputSchema.parse(input);
  return processUrlInternal(url, options);
}
```

**When to use:**

- ✅ **API/Lambda entry points** - First line of defense
- ✅ **External data sources** - HTTP responses, database records, file parsing
- ✅ **User input** - Query params, POST bodies, form data
- ✅ **Configuration files** - Validate on load
- ✅ **Public library functions** - Exported functions used by other modules

**When NOT to use:**

- ❌ Internal function calls (use TypeScript only)
- ❌ Hot path functions called 1000s of times per request
- ❌ Data already validated by upstream function

---

### 3. Development-Only Validation

**Cost:** Zero in production, ~1-10μs in development
**Coverage:** Catches contract violations during development/testing

```typescript
export function extractIds(input: ExtractIdsInput): ProductIds {
  if (process.env['NODE_ENV'] === 'development') {
    // Validate in dev to catch bugs early
    extractIdsInputSchema.parse(input);
  }

  // Trust input in production (already validated upstream)
  const { urlComponents } = input;
  return processUrlComponents(urlComponents);
}
```

**When to use:**

- ✅ **Downstream functions** - Called after initial validation
- ✅ **Internal contracts** - Verify assumptions during development
- ✅ **Performance-critical paths** - When you trust upstream but want dev safety
- ✅ **Intermediate validation** - Sanity checks between processing stages

**When NOT to use:**

- ❌ Primary API entry points (use full production validation)
- ❌ External data that wasn't validated upstream

---

### 4. Hybrid Validation (Tiered Approach)

**Cost:** Balanced - validate once at boundary, trust internally
**Coverage:** Best of both worlds

```typescript
// API boundary - Full validation
export function parseUrlComponents(input: unknown): URLComponents {
  const url = urlInputSchema.parse(input); // Validate external input
  return parseUrlComponentsInternal(url);
}

// Internal - TypeScript only
function parseUrlComponentsInternal(url: string): URLComponents {
  // Trust that url is valid (already validated)
  const urlObj = new URL(url);
  return {
    hostname: urlObj.hostname,
    pathname: urlObj.pathname,
    // ...
  };
}

// Downstream - Development validation only
export function extractIdsFromUrlComponents(input: ExtractIdsInput): ProductIds {
  if (process.env['NODE_ENV'] === 'development') {
    extractIdsInputSchema.parse(input); // Catch bugs in dev
  }

  // Production trusts upstream validation
  return extractIdsInternal(input.urlComponents);
}
```

---

## Decision Tree

```
Is this data from an external source?
├─ YES → Use Zod (Production Validation)
│   Examples: API input, HTTP responses, file parsing, DB records
│
└─ NO → Is this a public API/exported function?
    ├─ YES → Use Zod (Production Validation)
    │   Examples: Library entry points, Lambda handlers
    │
    └─ NO → Has upstream already validated this data?
        ├─ YES → Use Development-Only Validation or TypeScript only
        │   Examples: Internal helpers, downstream functions
        │
        └─ NO → Use Zod (Production Validation)
            Examples: First function to receive the data
```

---

## Real-World Examples

### Example 1: URL Processing Pipeline

```typescript
// ✅ Entry point - Validate external input
export function parseUrlComponents(input: unknown): URLComponents {
  const url = urlInputSchema.parse(input); // Zod - external input
  return parseUrlComponentsInternal(url);
}

// ✅ Internal - TypeScript only
function parseUrlComponentsInternal(url: string): URLComponents {
  const urlObj = new URL(url); // Trust url is valid string
  return createUrlComponents(urlObj);
}

// ✅ Downstream - Dev validation (optional)
export function extractIdsFromUrlComponents(input: ExtractIdsInput): ProductIds {
  if (process.env['NODE_ENV'] === 'development') {
    extractIdsInputSchema.parse(input); // Catch integration bugs
  }

  const { urlComponents } = input; // Trust in production
  return extractIdsInternal(urlComponents);
}

// ✅ Internal helper - TypeScript only
function extractIdsInternal(components: URLComponents): ProductIds {
  // No validation - called from validated context
  const ids = new Set<string>();
  // ... extraction logic
  return Object.freeze([...ids].sort());
}
```

### Example 2: Lambda Handler

```typescript
// ✅ Lambda entry - Validate everything
export async function handler(event: unknown) {
  // Validate external event from API Gateway
  const request = lambdaRequestSchema.parse(event);

  // Process with internal functions (no validation)
  const urlComponents = parseUrlComponentsInternal(request.url);
  const productIds = extractIdsInternal(urlComponents);

  return {
    statusCode: 200,
    body: JSON.stringify({ productIds }),
  };
}
```

### Example 3: Configuration Loading

```typescript
// ✅ Config loading - Validate on startup
export function loadStoreConfigs(): StoreConfig[] {
  const rawConfigs = JSON.parse(fs.readFileSync('configs.json', 'utf-8'));

  // Validate once at startup (not in hot path)
  return storeConfigsSchema.parse(rawConfigs);
}

// ✅ Config usage - TypeScript only
export function getStoreConfig(domain: string): StoreConfig | undefined {
  // Configs already validated at startup
  return STORE_CONFIG_MAP.get(domain);
}
```

---

## Performance Guidelines

### High-Traffic Paths (300+ RPS)

```typescript
// ❌ SLOW - Validates on every request
export function processUrl(input: unknown) {
  const data = complexSchema.parse(input); // Expensive!
  return extractIds(data);
}

// ✅ FAST - Validate once at boundary
export function processUrl(input: unknown) {
  const url = urlInputSchema.parse(input); // Quick validation
  return processUrlInternal(url); // No validation
}

function processUrlInternal(url: string) {
  const components = parseComponents(url); // No validation
  return extractIds(components); // No validation
}
```

### Validation Cost Examples

Measured on M1 Pro (approximate):

- `z.string()` - ~0.1μs
- `z.string().url()` - ~1μs
- `z.object({ 3 fields })` - ~2μs
- `z.object({ 8 fields + nested })` - ~5-10μs
- `z.array(z.object(...)).length(100)` - ~100μs

**At 300 RPS:**

- 10μs validation = 3ms/second total (0.3% overhead) ✅
- 100μs validation = 30ms/second total (3% overhead) ⚠️
- 1ms validation = 300ms/second total (30% overhead) ❌

---

## Migration Strategy

### Current State: `extractIdsFromUrlComponents`

```typescript
// Currently validates twice per request
export const extractIdsFromUrlComponents = (input: unknown): ProductIds => {
  const { urlComponents } = extractIdsInputSchema.parse(input); // ❌ Redundant
  // ... process ...
  return productIdsSchema.parse(sortedResults); // ❌ Redundant
};
```

### Phase 1: Development-Only Input Validation ✅

```typescript
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  // Removed runtime validation - trust TypeScript + upstream
  const { urlComponents } = input;
  // ... process with patternExtractorInternal (no validation) ...
  return productIdsSchema.parse(sortedResults); // Keep output validation
};
```

### Phase 2: Optional Output Validation (Proposed)

```typescript
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  const { urlComponents } = input;
  // ... process ...

  const sortedResults = Object.freeze([...results].sort());

  // Only validate in development
  if (process.env['NODE_ENV'] === 'development') {
    return productIdsSchema.parse(sortedResults);
  }

  return sortedResults as ProductIds;
};
```

### Phase 3: Full Trust (Most Aggressive)

```typescript
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  // No validation - pure TypeScript
  const { urlComponents } = input;
  // ... process ...
  return Object.freeze([...results].sort()) as ProductIds;
};
```

---

## Validation Pattern Library

### Pattern 1: Public API with Zod

```typescript
const inputSchema = z.object({
  /* ... */
});
export type Input = z.infer<typeof inputSchema>;

export function publicApi(input: unknown): Output {
  const validated = inputSchema.parse(input);
  return processInternal(validated);
}
```

### Pattern 2: Internal Function with TypeScript

```typescript
function internalHelper(data: ValidatedData): Result {
  // No runtime validation
  return data.value.toUpperCase();
}
```

### Pattern 3: Development-Only Validation

```typescript
export function downstreamFunction(input: Input): Output {
  if (process.env['NODE_ENV'] === 'development') {
    inputSchema.parse(input);
  }
  return processData(input);
}
```

### Pattern 4: Conditional Output Validation

```typescript
export function processData(input: Input): Output {
  const result = complexProcessing(input);

  if (process.env['NODE_ENV'] === 'development') {
    return outputSchema.parse(result);
  }

  return result as Output;
}
```

---

## Testing Requirements

### Unit Tests

All validation schemas must have dedicated test files:

```typescript
describe('inputSchema', () => {
  it('should accept valid input', () => {
    expect(inputSchema.parse(validData)).toEqual(validData);
  });

  it('should reject invalid input', () => {
    expect(() => inputSchema.parse(invalidData)).toThrow(ZodError);
  });
});
```

### Integration Tests

Test validation at boundaries:

```typescript
describe('API boundary validation', () => {
  it('should reject malformed input', () => {
    expect(() => parseUrlComponents('not a url')).toThrow(ZodError);
  });

  it('should process valid input', () => {
    const result = parseUrlComponents('https://example.com');
    expect(result).toBeDefined();
  });
});
```

### Performance Tests

Measure validation overhead:

```typescript
describe('validation performance', () => {
  it('should validate within budget', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      inputSchema.parse(testData);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10); // 10ms for 1000 validations
  });
});
```

---

## Recommendations Summary

### For `extractIdsFromUrlComponents`

**Phase 2 Recommendation:** Development-only input validation

```typescript
export const extractIdsFromUrlComponents = (input: unknown): ProductIds => {
  if (process.env['NODE_ENV'] === 'development') {
    const { urlComponents } = extractIdsInputSchema.parse(input);
  }

  const { urlComponents } = input as ExtractIdsInput;
  // ... process ...

  // Keep output validation for now (low cost, high value)
  return productIdsSchema.parse(sortedResults);
};
```

**Reasoning:**

- Input comes from `parseUrlComponents` which already validates
- Development validation catches integration bugs
- Output validation ensures internal correctness (regex matches spec)
- Can remove output validation in Phase 3 if measurements show it's needed

---

## Open Questions for Discussion

1. **Output validation trade-off:** Do we trust our regex patterns enough to skip output validation in production?

2. **Error handling:** Without Zod in production, we lose detailed error messages. Acceptable trade-off?

3. **Type assertions:** Using `as` bypasses TypeScript safety. Should we have stricter linting rules?

4. **Monitoring:** Should we add metrics to track validation failures in development to catch upstream bugs?

5. **Gradual rollout:** Should we use feature flags to A/B test validation-free paths?

6. **Schema exports:** Should we export schemas for downstream consumers to validate their inputs before calling us?

---

## Action Items

- [ ] Measure actual Zod overhead in production (add timing metrics)
- [ ] Implement Phase 2: Development-only input validation for `extractIdsFromUrlComponents`
- [ ] Create benchmark comparing validation strategies
- [ ] Document validation approach in each library's README
- [ ] Add ESLint rule to flag Zod validation in hot paths
- [ ] Create validation performance dashboard
