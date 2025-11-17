# Zod Integration Strategy

## Purpose

This document defines our strategy for using Zod across the codebase, particularly in standalone libraries. Zod provides runtime type validation, ensuring type safety beyond TypeScript's compile-time checks.

## Core Principles

### 1. **Single Source of Truth**

- Define schemas once, infer TypeScript types from them
- Use `z.infer<typeof schema>` instead of separate interfaces
- Schemas are the source of truth for both runtime validation and compile-time types

### 2. **Schema Organization**

- Store schemas in `schemas.ts` files within each library/module
- Export both schemas and inferred types
- Keep schemas close to the code that uses them

### 3. **Performance**

- Define schemas at module level (not inside functions)
- Schemas are parsed once at module load time
- Reuse schemas across function calls

### 4. **Error Handling**

- Use `.parse()` when you want to throw on invalid input
- Use `.safeParse()` when you want to handle errors gracefully
- Provide clear, actionable error messages

## File Structure

```
src/lib/[library-name]/
├── schemas.ts           # Zod schemas and inferred types
├── index.ts             # Public API exports (includes schemas)
├── [implementation].ts  # Implementation using schemas
├── __tests__/
│   ├── schemas.test.ts  # Schema validation tests
│   └── ...
└── README.md           # Documentation including schema usage
```

## Schema Patterns

### Input Validation Schema

Validates external input (user data, API requests, etc.)

```typescript
// schemas.ts
import { z } from 'zod';

// Define the schema
export const urlInputSchema = z
  .string({
    required_error: 'URL is required',
    invalid_type_error: 'URL must be a string',
  })
  .min(1, 'URL cannot be empty')
  .url('Invalid URL format')
  .refine(
    (url) => {
      const protocol = new URL(url).protocol;
      return protocol === 'http:' || protocol === 'https:';
    },
    {
      message: 'Only HTTP(S) protocols are allowed',
    },
  );

// Infer TypeScript type
export type UrlInput = z.infer<typeof urlInputSchema>;
```

### Output Validation Schema

Validates function outputs to ensure internal correctness

```typescript
// schemas.ts
export const urlComponentsSchema = z.object({
  href: z.string().url(),
  encodedHref: z.string(),
  hostname: z.string().min(1),
  pathname: z.string(),
  search: z.string(),
  domain: z.string().min(1),
  key: z
    .string()
    .length(16)
    .regex(/^[a-zA-Z0-9_-]+$/),
  original: z.string(),
});

export type URLComponents = z.infer<typeof urlComponentsSchema>;
```

### Configuration Schema

Validates configuration objects

```typescript
// schemas.ts
export const configSchema = z.object({
  MULTI_PART_TLDS: z.set(z.string()),
  PRESERVED_SUBDOMAINS: z.set(z.string()),
  NORMALIZATION_RULES: z.object({
    defaultProtocol: z.literal('https'),
    forceHttps: z.boolean(),
    stripWWW: z.boolean(),
    // ... other options
  }),
});

export type Config = z.infer<typeof configSchema>;
```

## Usage Patterns

### Pattern 1: Throwing on Invalid Input (Recommended for Libraries)

```typescript
// parseUrlComponents.ts
import { urlInputSchema, urlComponentsSchema } from './schemas';

export function parseUrlComponents(url: unknown): URLComponents {
  // Validate input - throws ZodError if invalid
  const validatedUrl = urlInputSchema.parse(url);

  try {
    const result = processUrl(validatedUrl);

    // Validate output - catches programming errors
    return urlComponentsSchema.parse(result);
  } catch (error) {
    throw new Error(`Failed to parse URL components for "${validatedUrl}": ${error.message}`);
  }
}
```

### Pattern 2: Safe Parse for Graceful Error Handling

```typescript
// parseUrlComponents.ts
import { urlInputSchema } from './schemas';

export function parseUrlComponentsSafe(
  url: unknown,
): { success: true; data: URLComponents } | { success: false; error: string } {
  // Safe parse - doesn't throw
  const result = urlInputSchema.safeParse(url);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join(', '),
    };
  }

  try {
    const components = parseUrlComponents(result.data);
    return { success: true, data: components };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Pattern 3: Partial Validation

```typescript
// For updates where not all fields are required
export const urlComponentsUpdateSchema = urlComponentsSchema.partial();

// For picking specific fields
export const urlKeyOnlySchema = urlComponentsSchema.pick({ key: true });
```

### Pattern 4: Schema Composition

```typescript
// Build complex schemas from simpler ones
const baseUrlSchema = z.object({
  href: z.string().url(),
  hostname: z.string().min(1),
});

export const urlComponentsSchema = baseUrlSchema.extend({
  pathname: z.string(),
  search: z.string(),
  domain: z.string().min(1),
  key: z.string().length(16),
  original: z.string(),
});
```

## Error Message Best Practices

### 1. Provide Context

```typescript
z.string().min(1, 'URL cannot be empty'); // Good
z.string().min(1); // Bad - unclear
```

### 2. Be Actionable

```typescript
z.string().url('Invalid URL format. Must start with http:// or https://'); // Good
z.string().url('Invalid URL'); // Bad
```

### 3. Use Custom Error Maps for Complex Validation

```typescript
const urlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const { protocol } = new URL(url);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message:
        'Only HTTP(S) protocols are allowed. Received protocol may be javascript:, data:, or file:',
    },
  );
```

## Testing Schemas

### Test Both Valid and Invalid Cases

```typescript
// schemas.test.ts
import { describe, it, expect } from 'vitest';
import { urlInputSchema } from './schemas';

describe('urlInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid HTTP URLs', () => {
      expect(urlInputSchema.parse('http://example.com')).toBe('http://example.com');
    });

    it('should accept valid HTTPS URLs', () => {
      expect(urlInputSchema.parse('https://example.com')).toBe('https://example.com');
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-string values', () => {
      expect(() => urlInputSchema.parse(123)).toThrow('URL must be a string');
    });

    it('should reject empty strings', () => {
      expect(() => urlInputSchema.parse('')).toThrow('URL cannot be empty');
    });

    it('should reject invalid URL formats', () => {
      expect(() => urlInputSchema.parse('not a url')).toThrow('Invalid URL format');
    });

    it('should reject non-HTTP(S) protocols', () => {
      expect(() => urlInputSchema.parse('javascript:alert(1)')).toThrow(
        'Only HTTP(S) protocols are allowed',
      );
    });
  });

  describe('error messages', () => {
    it('should provide clear error messages', () => {
      const result = urlInputSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('URL must be a string');
      }
    });
  });
});
```

## Performance Considerations

### ✅ DO: Define schemas at module level

```typescript
// Good - schema defined once
const urlSchema = z.string().url();

export function parseUrl(url: unknown) {
  return urlSchema.parse(url);
}
```

### ❌ DON'T: Create schemas inside functions

```typescript
// Bad - schema recreated on every call
export function parseUrl(url: unknown) {
  const urlSchema = z.string().url(); // ❌ Performance hit
  return urlSchema.parse(url);
}
```

### ✅ DO: Use schema composition for reusability

```typescript
// Good - reuse base schema
const baseSchema = z.object({ id: z.string() });
const extendedSchema = baseSchema.extend({ name: z.string() });
```

### ✅ DO: Use .strict() for exact object matching when needed

```typescript
// Rejects unknown properties
const strictSchema = z.object({ name: z.string() }).strict();
```

## Security Considerations

### Validate URL Protocols

```typescript
export const secureUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  }, 'Only HTTP(S) protocols are allowed');
```

### Validate Hostnames (if needed)

```typescript
const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];
const PRIVATE_IP_REGEX = /^(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./;

export const publicUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    const hostname = new URL(url).hostname;
    return !BLOCKED_HOSTNAMES.includes(hostname) && !PRIVATE_IP_REGEX.test(hostname);
  }, 'Private or local hostnames are not allowed');
```

### Sanitize Inputs

```typescript
export const sanitizedStringSchema = z
  .string()
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, 'String cannot be empty after trimming');
```

## Migration Strategy

### For Existing Libraries

1. **Create schemas.ts** - Define input/output schemas
2. **Update types** - Change from interfaces to `z.infer<typeof schema>`
3. **Add validation** - Wrap existing functions with schema validation
4. **Add tests** - Test both valid and invalid cases
5. **Update README** - Document schema usage and error handling
6. **Deprecate old API** (if breaking) - Provide migration guide

### Example Migration

**Before:**

```typescript
// parseUrlComponents.ts
export interface URLComponents {
  href: string;
  hostname: string;
  // ...
}

export function parseUrlComponents(url: string): URLComponents {
  // No runtime validation
  const normalized = normalizeUrl(url);
  // ...
}
```

**After:**

```typescript
// schemas.ts
import { z } from 'zod';

export const urlInputSchema = z.string().url();
export const urlComponentsSchema = z.object({
  href: z.string().url(),
  hostname: z.string().min(1),
  // ...
});

export type URLComponents = z.infer<typeof urlComponentsSchema>;

// parseUrlComponents.ts
import { urlInputSchema, urlComponentsSchema } from './schemas';

export function parseUrlComponents(url: unknown): URLComponents {
  const validatedUrl = urlInputSchema.parse(url);
  const result = processUrl(validatedUrl);
  return urlComponentsSchema.parse(result);
}
```

## Library Checklist

When adding Zod to a library, ensure:

- [ ] `schemas.ts` file created with all validation schemas
- [ ] Types inferred from schemas using `z.infer<>`
- [ ] Input validation using `.parse()` or `.safeParse()`
- [ ] Output validation for critical functions
- [ ] Clear, actionable error messages
- [ ] Schema tests covering valid and invalid cases
- [ ] README updated with schema usage examples
- [ ] Performance verified (schemas defined at module level)
- [ ] Security considerations addressed (protocol/hostname validation)
- [ ] TypeScript types exported alongside schemas

## Resources

- [Zod Documentation](https://zod.dev/)
- [Zod Error Handling](https://zod.dev/ERROR_HANDLING)
- [Zod Performance](https://zod.dev/PERFORMANCE)
- [Type Inference](https://zod.dev/INFERENCE)

## Examples in This Codebase

- `src/lib/parseUrlComponents/schemas.ts` - URL validation schemas
- `src/handlers/products/postProduct.schema.ts` - API request validation
- `src/middleware/zodValidator.ts` - Middleware pattern for validation
