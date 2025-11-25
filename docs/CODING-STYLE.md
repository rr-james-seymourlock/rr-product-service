# Coding Style Guide

> **Last Updated**: 2025-11-24
> **Applies To**: RR Product Service Monorepo

This document defines the coding standards and architectural patterns for the RR Product Service. These guidelines ensure consistency, maintainability, and type safety across all packages.

## Table of Contents

- [Philosophy](#philosophy)
- [Project Structure](#project-structure)
- [TypeScript Patterns](#typescript-patterns)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Service Architecture](#service-architecture)
- [Schema Validation](#schema-validation)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Testing](#testing)
- [Code Examples](#code-examples)

---

## Philosophy

### Core Principles

1. **Type Safety First** - Leverage TypeScript's type system for compile-time guarantees
2. **Explicit Over Implicit** - Code should be clear and self-documenting
3. **Fail Fast** - Validate early, throw errors immediately
4. **Single Responsibility** - Each module should have one clear purpose
5. **Testability** - Write code that's easy to test in isolation

### Design Goals

- **Maintainability** - Code should be easy to understand and modify
- **Performance** - Optimize for Lambda cold starts and warm invocations
- **Observability** - Structured logging and error tracking
- **Modularity** - Clear boundaries between packages

---

## Project Structure

### Monorepo Organization

```
rr-product-service/
├── apps/
│   └── product-service/       # Lambda service application
│       ├── src/
│       │   └── functions/     # Lambda handlers
│       ├── template.yaml      # AWS SAM template
│       └── esbuild.config.mjs # Build configuration
├── packages/
│   ├── product-id-extractor/  # Core extraction logic
│   ├── url-parser/            # URL parsing utilities
│   ├── store-registry/        # Store configuration
│   └── schema-parser/         # Schema parsing
├── tooling/
│   ├── typescript/            # Shared TypeScript config
│   ├── eslint-config/         # Shared ESLint config
│   └── prettier-config/       # Shared Prettier config
└── docs/                      # Documentation
```

### Package Structure

Each package follows a consistent internal structure:

```
package-name/
├── src/
│   ├── __tests__/            # Tests co-located with source
│   │   ├── unit.test.ts
│   │   ├── integration.test.ts
│   │   └── __fixtures__/     # Test data
│   ├── types.ts              # Type definitions and schemas
│   ├── config.ts             # Package configuration
│   ├── [feature].ts          # Core functionality
│   └── index.ts              # Public API exports
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## TypeScript Patterns

### Type vs Interface

**Prefer `type` aliases** for most definitions:

```typescript
// ✅ Preferred - type alias
type URLComponents = {
  domain: string;
  pathname: string;
  search: string;
  href: string;
};

type ProductIds = readonly string[];

// ✅ Type alias for unions
type StoreIdentifier =
  | { domain: string }
  | { id: string }
  | { domain: string; id: string };
```

**Use `interface` only when:**
- Defining contracts that may be extended by consumers
- Declaration merging is needed
- Explicitly documenting extensibility

```typescript
// ✅ Interface for extensible contract
interface StoreConfigInterface {
  id: string;
  name: string;
  domains: string[];
  pathnamePatterns?: RegExp[];
  searchPatterns?: RegExp[];
  transformId?: (id: string) => string;
}

// Can be extended by consumers if needed
interface CustomStoreConfig extends StoreConfigInterface {
  customField: string;
}
```

### Type Inference

**Leverage type inference wherever possible:**

```typescript
// ✅ Infer from Zod schema
const UrlInputSchema = z.object({
  url: z.string().url(),
  storeId: z.string().optional(),
});

type UrlInput = z.infer<typeof UrlInputSchema>; // Inferred

// ✅ Infer return types from functions
export function parseUrlComponents(input: string) {
  // Return type automatically inferred
  return {
    domain: extractDomain(input),
    pathname: extractPathname(input),
  };
}

// ❌ Avoid redundant explicit types
export function parseUrlComponents(input: string): {
  domain: string;
  pathname: string;
} {
  // Type already inferred, no need to specify
}
```

### Generics

**Use generics conservatively with sensible defaults:**

```typescript
// ✅ Generic with default
export function createClient<T = DefaultConfig>(config?: T) {
  return new Client(config);
}

// ✅ Generic with constraint
export function validateSchema<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

// ❌ Avoid unnecessary generics
export function parseUrl<T>(url: T): T {
  // Generic adds no value here
}
```

### Function Declarations

**Prefer named function declarations:**

```typescript
// ✅ Named function declaration
export function extractProductIds(url: string): ProductIds {
  // Implementation
}

// ✅ Named function expression for clarity
export const parseUrlComponents = (input: string): URLComponents => {
  // Implementation
};

// ❌ Avoid arrow functions for top-level exports (harder to debug)
export const extractProductIds = (url: string) => {
  // Stack traces show "extractProductIds" better with declarations
};
```

### Type-Only Imports

**Use type-only imports when importing only types:**

```typescript
// ✅ Type-only import
import type { StoreConfigInterface } from './types';
import type { Database } from '@kit/supabase/database';

// ✅ Mixed import
import { getStoreConfig } from './registry';
import type { StoreIdentifier } from './types';

// ❌ Regular import for types only
import { StoreConfigInterface } from './types'; // Unnecessary runtime import
```

---

## File Organization

### File Granularity

**One primary export per file:**

```
✅ Good structure:
src/
├── parser.ts           # parseUrlComponents function
├── types.ts            # Type definitions
├── config.ts           # Configuration constants
└── utils.ts            # Helper functions

❌ Avoid monolithic files:
src/
└── index.ts            # 1000+ lines with everything
```

### Barrel Exports

**Use index.ts as the public API:**

```typescript
// src/index.ts - Public API
export { parseUrlComponents, parseDomain } from './parser';
export { config } from './config';
export type { URLComponents } from './types';
export { urlComponentsSchema } from './types';

// Internal files are not exported
// - utils.ts (internal only)
// - helpers.ts (internal only)
```

### Test Co-location

**Place tests next to source code:**

```
src/
├── __tests__/
│   ├── parser.test.ts
│   ├── extract-domain.test.ts
│   ├── performance.bench.ts
│   └── __fixtures__/
│       ├── nike.json
│       └── target.json
├── parser.ts
└── extract-domain.ts
```

---

## Naming Conventions

### Files and Directories

```
✅ Files:           kebab-case.ts
✅ Directories:     kebab-case/
✅ Test files:      *.test.ts
✅ Benchmark files: *.bench.ts
✅ Type files:      types.ts or *.types.ts
✅ Config files:    config.ts or *.config.ts

Examples:
  - url-parser.ts
  - extract-product-ids.ts
  - store-registry.test.ts
  - performance.bench.ts
```

### Functions and Variables

```typescript
// ✅ Functions: camelCase (verb-based)
export function parseUrlComponents(input: string) { }
export function extractProductIds(url: string) { }
export function getStoreConfig(identifier: StoreIdentifier) { }

// ✅ Variables: camelCase (noun-based)
const productIds = extractProductIds(url);
const storeConfig = getStoreConfig({ domain: 'nike.com' });
const normalizedUrl = normalizeUrl(rawUrl);

// ✅ Constants: UPPER_SNAKE_CASE
export const MAX_RESULTS = 12;
export const TIMEOUT_MS = 100;
export const DEFAULT_CONFIG = { /* ... */ };
```

### Types and Interfaces

```typescript
// ✅ Types: PascalCase
export type URLComponents = { /* ... */ };
export type ProductIds = readonly string[];
export type StoreIdentifier = { /* ... */ };

// ✅ Interfaces: PascalCase with 'Interface' suffix (when needed for clarity)
export interface StoreConfigInterface {
  id: string;
  name: string;
}

// ✅ Enums: PascalCase
export enum UserRole {
  Admin = 'admin',
  User = 'user',
}
```

### Package Names

```
✅ Scoped packages:  @rr/package-name
✅ Package naming:   kebab-case

Examples:
  - @rr/url-parser
  - @rr/product-id-extractor
  - @rr/store-registry
  - @rr/schema-parser
```

---

## Service Architecture

### Service Pattern

Use **factory functions + private classes** for service modules:

```typescript
// ✅ Factory function (public API)
export function createProductService() {
  return new ProductService();
}

// ✅ Private class (implementation)
class ProductService {
  private readonly namespace = 'product.service';

  async getProduct(id: string): Promise<Product> {
    const logger = await getLogger();

    logger.info(
      { productId: id, namespace: this.namespace },
      'Fetching product'
    );

    try {
      const product = await this.fetchProduct(id);

      logger.info(
        { productId: id, namespace: this.namespace },
        'Product fetched successfully'
      );

      return product;
    } catch (error) {
      logger.error(
        { productId: id, error, namespace: this.namespace },
        'Failed to fetch product'
      );

      throw error;
    }
  }

  private async fetchProduct(id: string): Promise<Product> {
    // Implementation
  }
}
```

**Benefits:**
- Encapsulation of implementation details
- Easy to test (mock the factory)
- Clear separation of public API from internals
- Consistent namespace for logging

### Lambda Handler Structure

**Keep handlers thin - delegate to services:**

```typescript
// ✅ Lambda handler (thin orchestration)
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';

import { parseUrlComponents } from '@rr/url-parser';
import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';

export const handler = middy(async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // 1. Validate input
  const { url, storeId } = JSON.parse(event.body || '{}');

  // 2. Parse URL
  const urlComponents = parseUrlComponents(url);

  // 3. Extract IDs
  const productIds = extractIdsFromUrlComponents({
    urlComponents,
    storeId,
  });

  // 4. Return result
  return {
    statusCode: 200,
    body: JSON.stringify({ productIds }),
  };
})
  .use(httpJsonBodyParser())
  .use(httpErrorHandler());
```

### Layering Pattern

```
Lambda Handler (thin)
    ↓
Service Layer (business logic)
    ↓
Utility Layer (pure functions)
    ↓
External APIs / Database
```

---

## Schema Validation

### Zod for All Validation

**Use Zod as the single source of truth for validation:**

```typescript
// ✅ Define schema
export const ExtractIdsInputSchema = z.object({
  urlComponents: urlComponentsSchema,
  storeId: z.string().optional(),
});

// ✅ Infer type from schema
export type ExtractIdsInput = z.infer<typeof ExtractIdsInputSchema>;

// ✅ Validate with parse (throws on error)
export function extractIds(input: unknown): ProductIds {
  const validated = ExtractIdsInputSchema.parse(input);
  // validated is now typed as ExtractIdsInput
}

// ✅ Validate with safeParse (returns result object)
export function extractIdsSafe(input: unknown) {
  const result = ExtractIdsInputSchema.safeParse(input);

  if (!result.success) {
    // Handle validation errors
    return { success: false, errors: result.error };
  }

  return { success: true, data: result.data };
}
```

### Schema Composition

**Build complex schemas from smaller, reusable schemas:**

```typescript
// ✅ Composable schemas
export const baseKeySchema = z.string().min(1);
export const hostnameSchema = z.string().min(1);

export const urlComponentsSchema = z.object({
  domain: z.string().min(1),
  hostname: hostnameSchema,
  pathname: z.string(),
  search: z.string(),
  href: z.string().url(),
  key: baseKeySchema,
});

export const extractIdsInputSchema = z.object({
  urlComponents: urlComponentsSchema, // Reuse existing schema
  storeId: z.string().optional(),
});
```

### Environment Variable Validation

**Validate environment variables at startup:**

```typescript
// ✅ Validate config with Zod
export const config = z.object({
  MAX_RESULTS: z.number().int().positive().default(12),
  TIMEOUT_MS: z.number().int().positive().default(100),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
}).parse({
  MAX_RESULTS: process.env.MAX_RESULTS ? parseInt(process.env.MAX_RESULTS) : undefined,
  TIMEOUT_MS: process.env.TIMEOUT_MS ? parseInt(process.env.TIMEOUT_MS) : undefined,
  NODE_ENV: process.env.NODE_ENV,
});
```

---

## Error Handling

### Explicit Error Checking

**Always check for errors explicitly:**

```typescript
// ✅ Explicit error handling
export async function fetchData(id: string) {
  const { data, error } = await client.from('table').select('*').eq('id', id);

  if (error) {
    const logger = await getLogger();
    logger.error({ error, id }, 'Failed to fetch data');
    throw error; // Don't swallow errors
  }

  return data;
}

// ❌ Avoid silent failures
export async function fetchData(id: string) {
  const { data } = await client.from('table').select('*').eq('id', id);
  return data; // Might be null/undefined on error
}
```

### Try-Catch for External Operations

**Use try-catch for operations that might throw:**

```typescript
// ✅ Wrap external operations
export async function processUrl(url: string) {
  const logger = await getLogger();
  const ctx = { url, namespace: 'url.processor' };

  try {
    logger.info(ctx, 'Processing URL');

    const result = await externalApi.process(url);

    logger.info(ctx, 'URL processed successfully');
    return result;
  } catch (error) {
    logger.error({ ...ctx, error }, 'Failed to process URL');
    throw new Error(`URL processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Custom Error Classes

**Create custom errors for domain-specific failures:**

```typescript
// ✅ Custom error classes
export class StoreNotFoundError extends Error {
  constructor(
    public readonly identifier: StoreIdentifier,
    message?: string
  ) {
    super(message || 'Store configuration not found');
    this.name = 'StoreNotFoundError';
  }
}

export class InvalidUrlError extends Error {
  constructor(
    public readonly url: string,
    message?: string
  ) {
    super(message || 'Invalid URL format');
    this.name = 'InvalidUrlError';
  }
}

// Usage
if (!storeConfig) {
  throw new StoreNotFoundError(identifier, `No config found for ${identifier.domain}`);
}
```

---

## Logging

### Structured Logging

**Use structured logging with context:**

```typescript
// ✅ Structured logging with context
const logger = await getLogger();

logger.info(
  {
    userId: user.id,
    storeId: store.id,
    namespace: 'product.extraction',
  },
  'Extracting product IDs'
);

logger.error(
  {
    error,
    url: input.url,
    namespace: 'product.extraction',
  },
  'Failed to extract product IDs'
);

// ❌ Avoid console.log
console.log('Extracting product IDs for user:', user.id);
console.error('Error:', error);
```

### Log Levels

```typescript
// Use appropriate log levels
logger.debug(ctx, 'Detailed debugging information');
logger.info(ctx, 'General information');
logger.warn(ctx, 'Warning - something unexpected');
logger.error(ctx, 'Error - operation failed');
```

### Namespace Convention

**Use consistent namespaces for tracing:**

```typescript
// ✅ Hierarchical namespaces
class UrlParserService {
  private namespace = 'url-parser.service';
}

class ProductExtractorService {
  private namespace = 'product-extractor.service';
}

class StoreRegistryService {
  private namespace = 'store-registry.service';
}
```

---

## Testing

### Test Organization

**Organize tests by feature/behavior:**

```typescript
// ✅ Descriptive test structure
describe('parseUrlComponents', () => {
  describe('domain extraction', () => {
    it('should extract base domain from URL', () => {
      const result = parseUrlComponents('https://www.nike.com/product/123');
      expect(result.domain).toBe('nike.com');
    });

    it('should handle subdomains correctly', () => {
      const result = parseUrlComponents('https://shop.nike.com/product/123');
      expect(result.domain).toBe('nike.com');
    });
  });

  describe('pathname extraction', () => {
    it('should extract pathname from URL', () => {
      const result = parseUrlComponents('https://nike.com/product/123');
      expect(result.pathname).toBe('/product/123');
    });
  });
});
```

### Test Data

**Use fixtures for complex test data:**

```typescript
// __fixtures__/nike-urls.ts
export const nikeUrlFixtures = {
  simpleProduct: {
    url: 'https://www.nike.com/t/air-max-90/123456',
    expected: {
      domain: 'nike.com',
      pathname: '/t/air-max-90/123456',
    },
  },
  productWithQuery: {
    url: 'https://www.nike.com/product?id=123456',
    expected: {
      domain: 'nike.com',
      search: '?id=123456',
    },
  },
};

// In test file
import { nikeUrlFixtures } from './__fixtures__/nike-urls';

it('should parse Nike URLs', () => {
  const result = parseUrlComponents(nikeUrlFixtures.simpleProduct.url);
  expect(result.domain).toBe(nikeUrlFixtures.simpleProduct.expected.domain);
});
```

### Benchmarks

**Use Vitest bench for performance testing:**

```typescript
// performance.bench.ts
import { bench, describe } from 'vitest';
import { extractProductIds } from '../extractor';

describe('extractProductIds performance', () => {
  bench('extract from simple URL', () => {
    extractProductIds('https://nike.com/product/123456');
  });

  bench('extract from complex URL with query params', () => {
    extractProductIds('https://nike.com/product/123?variant=456&color=blue');
  });
});
```

---

## Code Examples

### Complete Package Example

Here's a complete example of a well-structured package:

```typescript
// src/types.ts
import { z } from 'zod';

export const urlInputSchema = z.string().url();

export const urlComponentsSchema = z.object({
  domain: z.string().min(1),
  pathname: z.string(),
  search: z.string(),
  href: z.string().url(),
});

export type URLComponents = z.infer<typeof urlComponentsSchema>;

// src/config.ts
import { z } from 'zod';

export const config = z.object({
  TIMEOUT_MS: z.number().int().positive().default(100),
  MAX_RETRIES: z.number().int().positive().default(3),
}).parse({
  TIMEOUT_MS: process.env.URL_PARSER_TIMEOUT_MS
    ? parseInt(process.env.URL_PARSER_TIMEOUT_MS)
    : undefined,
  MAX_RETRIES: process.env.URL_PARSER_MAX_RETRIES
    ? parseInt(process.env.URL_PARSER_MAX_RETRIES)
    : undefined,
});

// src/parser.ts
import normalizeUrl from 'normalize-url';
import type { URLComponents } from './types';
import { urlComponentsSchema, urlInputSchema } from './types';
import { config } from './config';

export function parseUrlComponents(input: unknown): URLComponents {
  // Validate input
  const url = urlInputSchema.parse(input);

  // Normalize URL
  const normalized = normalizeUrl(url, {
    stripHash: true,
    stripWWW: false,
  });

  // Parse URL
  const urlObj = new URL(normalized);
  const domain = extractDomain(urlObj.hostname);

  const result = {
    domain,
    pathname: urlObj.pathname,
    search: urlObj.search,
    href: normalized,
  };

  // Validate output
  return urlComponentsSchema.parse(result);
}

function extractDomain(hostname: string): string {
  // Remove www. prefix
  return hostname.replace(/^www\./, '');
}

// src/__tests__/parser.test.ts
import { describe, expect, it } from 'vitest';
import { parseUrlComponents } from '../parser';

describe('parseUrlComponents', () => {
  it('should parse a valid URL', () => {
    const result = parseUrlComponents('https://www.nike.com/product/123');

    expect(result.domain).toBe('nike.com');
    expect(result.pathname).toBe('/product/123');
    expect(result.search).toBe('');
  });

  it('should throw on invalid URL', () => {
    expect(() => parseUrlComponents('not-a-url')).toThrow();
  });

  it('should handle URLs with query parameters', () => {
    const result = parseUrlComponents('https://nike.com/product?id=123');

    expect(result.domain).toBe('nike.com');
    expect(result.search).toBe('?id=123');
  });
});

// src/index.ts
export { parseUrlComponents } from './parser';
export { config } from './config';
export type { URLComponents } from './types';
export { urlComponentsSchema } from './types';
```

---

## Checklist for Code Reviews

Use this checklist when reviewing code:

### TypeScript
- [ ] Using `type` over `interface` where appropriate?
- [ ] Type inference leveraged (not redundant explicit types)?
- [ ] Type-only imports used for types?
- [ ] Generics have sensible defaults?

### Structure
- [ ] One primary export per file?
- [ ] Tests co-located with source?
- [ ] Barrel exports in index.ts?
- [ ] Clear separation of concerns?

### Naming
- [ ] Files and directories in kebab-case?
- [ ] Functions are camelCase verbs?
- [ ] Types are PascalCase?
- [ ] Constants are UPPER_SNAKE_CASE?

### Validation
- [ ] Zod schemas for all external inputs?
- [ ] Types inferred from schemas?
- [ ] Environment variables validated?

### Error Handling
- [ ] Errors checked explicitly?
- [ ] Errors logged with context?
- [ ] Errors never silently swallowed?
- [ ] Custom error classes for domain errors?

### Logging
- [ ] Structured logging with context?
- [ ] Consistent namespace used?
- [ ] Appropriate log levels?
- [ ] No console.log in production code?

### Testing
- [ ] Tests organized by behavior?
- [ ] Test fixtures for complex data?
- [ ] Descriptive test names?
- [ ] Edge cases covered?

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

**Questions or Suggestions?** Open an issue or PR to discuss changes to this guide.
