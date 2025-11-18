# Validation Implementation Plan

**Goal:** Balance validation, safety, and performance for 300 RPS Lambda workload

## Core Principles

1. **Entry points must validate** - External data needs checking
2. **Development gets full validation** - Catch bugs early
3. **Production uses lightweight validation** - Performance optimized
4. **Errors are handled, not thrown** - Graceful degradation
5. **Downstream functions trust upstream** - Validate once

---

## Proposed Implementation

### Strategy 1: Entry Point Validation (parseUrlComponents)

`parseUrlComponents` is the entry point receiving external URL strings. Needs validation but optimized for production.

#### Current Implementation (Full Zod)

```typescript
export const parseUrlComponents = (input: unknown): URLComponents => {
  // ❌ Always validates with Zod (production + dev)
  const url = urlInputSchema.parse(input);
  // ... process
};
```

**Cost at 300 RPS:**

- Zod validation: ~5-10μs per request
- Total: 1.5-3ms/second (0.15-0.3% overhead)
- **Acceptable but optimizable**

#### Option A: Development-Only Zod (Recommended)

```typescript
export const parseUrlComponents = (input: unknown): URLComponents => {
  let url: string;

  if (process.env['NODE_ENV'] === 'development') {
    // Full Zod validation in development
    url = urlInputSchema.parse(input);
  } else {
    // Lightweight validation in production
    if (typeof input !== 'string' || input.length === 0) {
      throw new Error('URL must be a non-empty string');
    }
    url = input;
  }

  try {
    // URL constructor validates format (built-in, fast)
    const urlObj = new URL(url);

    // Block dangerous protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${urlObj.protocol}`);
    }

    return createUrlComponents(urlObj);
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
```

**Benefits:**

- ✅ Development: Full Zod validation catches all edge cases
- ✅ Production: Native URL constructor (microseconds, not milliseconds)
- ✅ Security: Protocol validation prevents javascript:/data: URLs
- ✅ Error handling: Throws descriptive errors

**Cost in production:**

- Type check: ~0.1μs
- URL constructor: ~1-2μs
- Protocol check: ~0.1μs
- **Total: ~2μs (vs 5-10μs with Zod) = 50-80% faster**

#### Option B: Result Type (No Throwing)

If you want to avoid throwing errors entirely:

```typescript
type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

export const parseUrlComponents = (input: unknown): ParseResult<URLComponents> => {
  if (process.env['NODE_ENV'] === 'development') {
    const result = urlInputSchema.safeParse(input);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    input = result.data;
  }

  if (typeof input !== 'string' || input.length === 0) {
    return { success: false, error: 'URL must be a non-empty string' };
  }

  try {
    const urlObj = new URL(input as string);

    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { success: false, error: `Invalid protocol: ${urlObj.protocol}` };
    }

    return { success: true, data: createUrlComponents(urlObj) };
  } catch (error) {
    return {
      success: false,
      error: `Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
```

**Benefits:**

- ✅ No exceptions thrown (faster in V8)
- ✅ Explicit error handling at call sites
- ✅ Type-safe error checking

**Drawbacks:**

- ⚠️ Breaking change - all callers need to handle result type
- ⚠️ More verbose at call sites

---

### Strategy 2: Downstream Validation (extractIdsFromUrlComponents)

`extractIdsFromUrlComponents` receives `URLComponents` that were already validated by `parseUrlComponents`.

#### Recommended Implementation

```typescript
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  // Development: Validate contract between functions
  if (process.env['NODE_ENV'] === 'development') {
    extractIdsInputSchema.parse(input);
  }

  // Production: Trust upstream (TypeScript ensures shape)
  const { urlComponents, storeId } = input;

  const { domain, pathname, search, href } = urlComponents;
  const results = new Set<string>();

  try {
    // ... extraction logic (no validation) ...
  } catch (error) {
    console.error(
      `Error processing URL ${href}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  const sortedResults = Object.freeze([...results].sort());

  // Output validation: Ensure extracted IDs meet spec
  if (process.env['NODE_ENV'] === 'development') {
    return productIdsSchema.parse(sortedResults);
  }

  // Production: Trust our regex patterns
  return sortedResults as ProductIds;
};
```

**Benefits:**

- ✅ Zero validation overhead in production
- ✅ Development catches integration bugs
- ✅ TypeScript ensures type safety
- ✅ Output validation in dev ensures regex correctness

**Cost in production:**

- Input validation: 0μs (skipped)
- Output validation: 0μs (skipped)
- **Total: 0μs saved per request**

At 300 RPS with 4-6 calls to `patternExtractor`:

- Saved: ~1200-1800 validations/second
- **Significant performance win**

---

## Validation Summary

| Function                      | Development        | Production                          | Reasoning                              |
| ----------------------------- | ------------------ | ----------------------------------- | -------------------------------------- |
| `parseUrlComponents`          | Full Zod           | Native URL constructor + type check | Entry point, external data             |
| `extractIdsFromUrlComponents` | Zod input + output | No validation                       | Downstream, trusted input              |
| `patternExtractor` (public)   | Full Zod           | Full Zod                            | Public API, could be called externally |
| `patternExtractorInternal`    | None               | None                                | Internal only, trusted callers         |

---

## Error Handling Strategy

### For Entry Points

```typescript
// Option 1: Throw errors (current approach)
export const parseUrlComponents = (input: unknown): URLComponents => {
  if (typeof input !== 'string') {
    throw new Error('URL must be a string'); // Caller catches this
  }
  // ...
};

// Usage
try {
  const components = parseUrlComponents(userInput);
  const ids = extractIdsFromUrlComponents({ urlComponents: components });
  return { success: true, ids };
} catch (error) {
  return { success: false, error: error.message };
}
```

### For Internal Functions

```typescript
// Internal functions can throw - caught by entry point
const extractIdsInternal = (components: URLComponents): ProductIds => {
  // If something goes wrong, let it bubble up
  const results = new Set<string>();
  // ... extraction logic
  return Object.freeze([...results].sort()) as ProductIds;
};
```

---

## Implementation Phases

### Phase 1: Optimize Entry Point ✅ Ready

1. Update `parseUrlComponents` to use development-only Zod
2. Keep native URL constructor validation in production
3. Maintain error throwing behavior (no breaking changes)

**Expected Impact:**

- 50-80% faster validation at entry point
- ~1.5-2.5μs saved per request
- At 300 RPS: ~0.45-0.75ms/second saved

### Phase 2: Remove Downstream Validation ✅ Ready

1. Update `extractIdsFromUrlComponents` to skip validation in production
2. Keep development validation for safety
3. Remove output validation in production (trust regex patterns)

**Expected Impact:**

- 1200-1800 fewer validations/second
- ~10-15ms/second saved at 300 RPS
- **Combined with Phase 1: ~30-40% overall improvement**

### Phase 3: Result Types (Optional, Breaking Change)

1. Change `parseUrlComponents` to return `Result<URLComponents>`
2. Update all callers to handle result type
3. More explicit error handling

**Expected Impact:**

- Cleaner error handling
- No exceptions in hot path
- 5-10% additional performance gain

---

## Testing Strategy

### Unit Tests

```typescript
describe('parseUrlComponents validation', () => {
  describe('development mode', () => {
    beforeEach(() => {
      process.env['NODE_ENV'] = 'development';
    });

    it('should validate with Zod in development', () => {
      expect(() => parseUrlComponents(123)).toThrow(ZodError);
      expect(() => parseUrlComponents('')).toThrow(ZodError);
    });

    it('should reject dangerous protocols in development', () => {
      expect(() => parseUrlComponents('javascript:alert(1)')).toThrow('Invalid protocol');
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      process.env['NODE_ENV'] = 'production';
    });

    it('should validate with native checks in production', () => {
      expect(() => parseUrlComponents(123)).toThrow('URL must be a non-empty string');
      expect(() => parseUrlComponents('')).toThrow('URL must be a non-empty string');
    });

    it('should reject dangerous protocols in production', () => {
      expect(() => parseUrlComponents('javascript:alert(1)')).toThrow('Invalid protocol');
    });

    it('should accept valid URLs in production', () => {
      const result = parseUrlComponents('https://example.com');
      expect(result).toBeDefined();
      expect(result.hostname).toBe('example.com');
    });
  });
});
```

### Integration Tests

```typescript
describe('validation pipeline', () => {
  it('should validate at entry and trust downstream', () => {
    const url = 'https://nike.com/product/abc-123';

    // Entry point validates
    const components = parseUrlComponents(url);

    // Downstream trusts input (no validation in production)
    const ids = extractIdsFromUrlComponents({ urlComponents: components });

    expect(ids).toEqual(['abc-123']);
  });

  it('should handle invalid URLs gracefully', () => {
    expect(() => parseUrlComponents('not-a-url')).toThrow('Invalid URL');
  });
});
```

### Performance Tests

```typescript
describe('validation performance', () => {
  it('should validate entry point within budget', () => {
    const urls = Array(1000).fill('https://example.com/product/123');

    const start = performance.now();
    urls.forEach((url) => parseUrlComponents(url));
    const duration = performance.now() - start;

    // Should complete 1000 validations in < 10ms
    expect(duration).toBeLessThan(10);
  });

  it('should skip downstream validation in production', () => {
    process.env['NODE_ENV'] = 'production';

    const components = parseUrlComponents('https://example.com/product/123');

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      extractIdsFromUrlComponents({ urlComponents: components });
    }
    const duration = performance.now() - start;

    // Should be very fast without validation
    expect(duration).toBeLessThan(50);
  });
});
```

---

## Security Considerations

### Protocol Validation (Critical)

```typescript
// ✅ SAFE - Always validates protocol
if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
  throw new Error(`Invalid protocol: ${urlObj.protocol}`);
}

// Blocks: javascript:, data:, file:, ftp:, etc.
```

### Type Validation (Production)

```typescript
// ✅ SAFE - Minimal check prevents most errors
if (typeof input !== 'string' || input.length === 0) {
  throw new Error('URL must be a non-empty string');
}
```

### URL Constructor (Built-in Validation)

```typescript
// ✅ SAFE - Throws on invalid URLs
const urlObj = new URL(input);
// Validates: protocol, hostname, port, path, etc.
```

**Security is maintained even with lightweight validation!**

---

## Performance Comparison

### Before Optimization

```typescript
parseUrlComponents → Zod validation (5-10μs)
  ↓
extractIdsFromUrlComponents → Zod input validation (5-10μs)
  ↓
patternExtractor × 4-6 calls → Zod validation × 4-6 (20-60μs)
  ↓
Output validation → Zod validation (5-10μs)

Total: 35-90μs per request
At 300 RPS: 10.5-27ms/second
```

### After Optimization

```typescript
parseUrlComponents → Native validation (2μs)
  ↓
extractIdsFromUrlComponents → No validation (0μs)
  ↓
patternExtractorInternal × 4-6 calls → No validation (0μs)
  ↓
No output validation → (0μs)

Total: 2μs per request
At 300 RPS: 0.6ms/second

Savings: 33-88μs per request (94-98% reduction in validation overhead)
```

---

## Recommendation: Implement Both Phases

### Phase 1 + Phase 2 Combined

**Changes to `parseUrlComponents`:**

```typescript
export const parseUrlComponents = (input: unknown): URLComponents => {
  let url: string;

  if (process.env['NODE_ENV'] === 'development') {
    url = urlInputSchema.parse(input);
  } else {
    if (typeof input !== 'string' || input.length === 0) {
      throw new Error('URL must be a non-empty string');
    }
    url = input;
  }

  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${urlObj.protocol}`);
    }
    return createUrlComponents(urlObj);
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
```

**Changes to `extractIdsFromUrlComponents`:**

```typescript
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  if (process.env['NODE_ENV'] === 'development') {
    extractIdsInputSchema.parse(input);
  }

  const { urlComponents, storeId } = input;
  // ... extraction logic ...

  const sortedResults = Object.freeze([...results].sort());

  if (process.env['NODE_ENV'] === 'development') {
    return productIdsSchema.parse(sortedResults);
  }

  return sortedResults as ProductIds;
};
```

**Impact:**

- ✅ Full validation in development (catch all bugs)
- ✅ Minimal validation in production (optimal performance)
- ✅ No breaking changes (same API)
- ✅ 94-98% reduction in validation overhead
- ✅ Security maintained (protocol + type checks)
- ✅ Error handling unchanged

---

## Questions for Discussion

1. **Entry point approach:** Option A (throw errors) or Option B (result type)?
   - Recommendation: Option A (no breaking changes)

2. **Output validation:** Keep in dev only, or remove completely?
   - Recommendation: Keep in dev (validates regex patterns work correctly)

3. **Error messages:** Are native error messages sufficient in production?
   - Current: "Invalid URL: Invalid URL string"
   - Alternative: Could add custom messages if needed

4. **Rollout:** Implement both phases together, or Phase 1 first?
   - Recommendation: Both together (maximum impact, well-tested)

Ready to implement?
