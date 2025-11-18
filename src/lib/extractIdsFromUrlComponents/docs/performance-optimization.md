# Performance Optimization Recommendations

**Target:** 300 requests per second on AWS Lambda
**Date:** 2025-11-18
**Current Coverage:** 97.91% lines, 97.36% branches
**Status:** Review and implement over time

---

## 🔴 Critical Performance Concerns

### 1. Double Zod Validation (Input + Output)

**Location:** `extractIdsFromUrlComponents.ts:113, 169`

**Issue:**

- Input validation includes nested `urlComponentsSchema` (8 fields with complex validation)
- Output validation checks array + validates each product ID with regex
- Every request validates twice (~600 validations/second at 300 RPS)

**Impact:** High - Significant CPU overhead from redundant validation

**Recommendation:**

```typescript
// Option A: Skip input validation (trust parseUrlComponents)
export const extractIdsFromUrlComponents = (input: ExtractIdsInput): ProductIds => {
  const { urlComponents, storeId } = input; // Type assertion only
  // ... implementation
};

// Option B: Only validate in development
export const extractIdsFromUrlComponents = (input: unknown): ProductIds => {
  const { urlComponents, storeId } =
    process.env['NODE_ENV'] === 'development'
      ? extractIdsInputSchema.parse(input)
      : (input as ExtractIdsInput);
  // ... implementation
};
```

**Questions:**

- Do we trust `urlComponents` from `parseUrlComponents`? (Already validated)
- Can we skip input validation entirely or use lighter checks?
- Is output validation necessary if product IDs match regex during extraction?

**Priority:** High
**Status:** [ ] Not started

---

### 2. Date.now() in Hot Loop

**Location:** `extractIdsFromUrlComponents.ts:49, 53`

**Issue:**

- `Date.now()` called on every regex match iteration (potentially 12+ times per extraction)
- At 300 RPS with multiple patterns, thousands of syscalls/second
- System call overhead on every match

**Impact:** Medium - Measurable overhead in tight loops

**Recommendation:**

```typescript
// Option A: Check every N iterations
let iterationCount = 0;
const CHECK_INTERVAL = 5;
while ((match = pattern.exec(source)) !== null) {
  if (++iterationCount % CHECK_INTERVAL === 0 && Date.now() - startTime >= config.TIMEOUT_MS) {
    console.warn(`Pattern extraction timed out...`);
    break;
  }
  // ... rest of logic
}

// Option B: Remove timeout for small strings
const startTime = source.length > 1000 ? Date.now() : 0;
while ((match = pattern.exec(source)) !== null) {
  if (startTime && Date.now() - startTime >= config.TIMEOUT_MS) {
    console.warn(`Pattern extraction timed out...`);
    break;
  }
  // ... rest of logic
}
```

**Questions:**

- Is 100ms timeout appropriate? Have we seen slow regexes in practice?
- What's the average string length we're processing?
- Can we remove timeout entirely for strings under certain length?

**Priority:** High
**Status:** [x] Completed (commit 011e6de)

---

### 3. Global RegExp State Reset Issues

**Location:** `extractIdsFromUrlComponents.ts:52`

**Issue:**

- Global regexes maintain `lastIndex` state
- If error occurs mid-execution, pattern state isn't reset
- Subsequent calls could start from wrong position

**Impact:** Medium - Potential for missed matches or unexpected behavior

**Recommendation:**

```typescript
try {
  while ((match = pattern.exec(source)) !== null) {
    // ... processing
  }
} catch (error) {
  console.error(`Error extracting patterns...`);
} finally {
  pattern.lastIndex = 0; // Always reset state
}
```

**Priority:** High
**Status:** [x] Completed (commit 011e6de)

---

### 4. Zod Validation in patternExtractor

**Location:** `extractIdsFromUrlComponents.ts:35`

**Issue:**

- `patternExtractorInputSchema.parse()` called 4-6 times per request
- At 300 RPS, that's 1200-1800 validations/second for internal function
- Function is called internally with known-valid inputs

**Impact:** High - Unnecessary validation overhead

**Recommendation:**

```typescript
// Internal version without validation
const patternExtractorInternal = (source: string, pattern: RegExp): Set<string> => {
  // No validation - trust internal calls
  const matches = new Set<string>();
  let match;
  const startTime = Date.now();

  try {
    while ((match = pattern.exec(source)) !== null) {
      // ... existing logic
    }
  } catch (error) {
    console.error(`Error extracting patterns...`);
  } finally {
    pattern.lastIndex = 0;
  }

  return matches;
};

// Public API with validation (if needed for exports)
export const patternExtractor = (input: unknown): Set<string> => {
  const { source, pattern } = patternExtractorInputSchema.parse(input);
  return patternExtractorInternal(source, pattern);
};

// Update extractIdsFromUrlComponents to use internal version
export const extractIdsFromUrlComponents = (input: unknown): ProductIds => {
  // ...
  for (const id of patternExtractorInternal(pathname, pattern)) {
    // ...
  }
};
```

**Priority:** High
**Status:** [x] Completed (commit 011e6de)

---

## 🟡 Moderate Performance Concerns

### 5. Console Logging in Production

**Location:** Lines 54, 69, 76, 162

**Issue:**

- Console logging in Lambda is synchronous and writes to CloudWatch
- Every error/warning blocks execution until write completes
- At scale, this compounds and adds latency

**Impact:** Medium - Latency on error paths

**Recommendation:**

```typescript
// Option A: No-op logger in production
const logger =
  process.env['NODE_ENV'] === 'production' ? { warn: () => {}, error: () => {} } : console;

// Option B: Async structured logging
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger();

// Option C: Metrics instead of logs
import { Metrics } from '@aws-lambda-powertools/metrics';
const metrics = new Metrics();
metrics.addMetric('PatternExtractionTimeout', MetricUnits.Count, 1);
```

**Questions:**

- What's the error rate in production?
- Are these logs actionable or just noise?
- Do we have structured logging/metrics infrastructure?

**Priority:** Medium
**Status:** [ ] Not started

---

### 6. Memory Allocations

**Location:** `extractIdsFromUrlComponents.ts:116, 166`

**Issue:**

- Set allocation per request
- Array spread creates new array
- Array.sort() requires comparison operations
- Object.freeze() traverses object

**Impact:** Low-Medium - GC pressure at 300 RPS

**Recommendation:**

```typescript
// Optimization: Reuse patterns where possible
// Note: This is minor - only optimize if measurements show GC issues

// Consider: Is Object.freeze() necessary?
// It prevents mutations but adds overhead
const sortedResults = [...results].sort();
return productIdsSchema.parse(sortedResults);
```

**Questions:**

- Do we need Object.freeze() on the return value?
- What's the average number of IDs extracted per request?

**Priority:** Low
**Status:** [ ] Not started

---

### 7. Try-Catch Performance Impact

**Location:** `extractIdsFromUrlComponents.ts:51-78, 118-164`

**Issue:**

- Try-catch blocks can prevent V8 optimizations in some cases
- Minor impact but matters at high RPS

**Impact:** Low - V8 optimization considerations

**Recommendation:**

- Keep try-catch for safety
- Consider measuring if hot path optimization is needed
- V8 handles try-catch well in modern versions

**Priority:** Low
**Status:** [ ] Not started

---

## 🟢 Good Patterns (Keep These)

### ✅ Pre-compiled RegExp Patterns

Module-level pattern compilation - zero overhead per request

### ✅ ReadonlyMap Store Lookups

O(1) lookups with immutable data structures

### ✅ MAX_RESULTS Limiting

Prevents runaway extraction

### ✅ Set for Deduplication

Efficient duplicate handling before sorting

---

## 🎯 Recommended Implementation Order

### Phase 1: High Impact, Low Risk ✅ COMPLETED

1. **Make patternExtractor internal** (Optimization #4) ✅
   - Remove Zod validation for internal calls
   - Keep validated version for public API if needed
   - Expected impact: 1200-1800 fewer validations/second
   - **Status:** Completed in commit 011e6de

2. **Add RegExp state reset** (Optimization #3) ✅
   - Add `finally` block with `pattern.lastIndex = 0`
   - Prevents subtle bugs in error cases
   - Zero performance cost
   - **Status:** Completed in commit 011e6de

3. **Reduce Date.now() frequency** (Optimization #2) ✅
   - Check every 5 iterations instead of every iteration
   - Expected impact: 80% reduction in syscalls
   - **Status:** Completed in commit 011e6de

### Phase 2: High Impact, Medium Risk

4. **Skip input validation** (Optimization #1)
   - Trust `parseUrlComponents` output
   - Biggest performance win (30-40% overhead reduction)
   - Requires confidence in upstream validation

5. **Optional output validation** (Related to #1)
   - Only validate in development mode
   - Skip in production for performance

### Phase 3: Polish

6. **Replace console with structured logging** (Optimization #5)
   - Use metrics or async logging
   - Reduce latency on error paths

7. **Memory optimization** (Optimization #6)
   - Only if measurements show GC pressure
   - Consider removing Object.freeze()

---

## 📊 Measurement Plan

Before implementing optimizations:

1. **Baseline Performance**
   - Average execution time per request
   - P50, P95, P99 latencies
   - Memory usage per request
   - GC frequency/duration

2. **Load Test Scenarios**
   - 300 RPS sustained for 5 minutes
   - 500 RPS burst for 1 minute
   - Mixed URL patterns (simple vs complex)

3. **After Each Optimization**
   - Compare against baseline
   - Measure improvement
   - Check for regressions

4. **Monitoring Metrics**
   - Lambda duration
   - Lambda memory usage
   - Cold start time
   - Error rate

---

## 🔍 Open Questions

1. What's the current P95 latency in production?
2. Have we seen timeout warnings in logs?
3. What's the error rate for extraction failures?
4. Do we have existing performance tests?
5. What's the average URL complexity (length, number of patterns matched)?
6. Is there a performance budget we need to meet?

---

## 📝 Notes

- All optimizations should be behind feature flags initially
- Maintain test coverage (currently 97.91%)
- Document any behavior changes
- Consider A/B testing high-risk changes
