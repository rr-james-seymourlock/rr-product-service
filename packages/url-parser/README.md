# @rr/url-parser

A robust URL parsing and normalization library that processes e-commerce URLs into standardized components for consistent product identification and data storage.

## Purpose

Normalizes and parses URLs into structured components, removing tracking parameters, standardizing protocols, and extracting domain information. Generates unique keys for caching and database storage.

## Features

- **URL Normalization**: Removes tracking parameters, forces HTTPS, strips WWW
- **Domain Parsing**: Handles multi-part TLDs (co.uk, com.au) and brand subdomains
- **Unique Key Generation**: Creates SHA-1 based keys for Redis/DynamoDB
- **Comprehensive Tracking Removal**: Strips 50+ UTM, marketing, and platform-specific parameters
- **Brand Subdomain Preservation**: Maintains Gap, Old Navy, Banana Republic subdomains
- **Custom Error Classes**: Type-safe error handling with detailed context
- **Structured Logging**: JSON-formatted logs with namespaces for debugging
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Performance Optimized**: Lightweight validation in production, comprehensive in development

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { parseUrlComponents } from '@rr/url-parser';
```

## Usage

### Basic Example

```typescript
import { parseUrlComponents } from '@rr/url-parser';

const url = 'https://www.nike.com/t/air-max-270-mens-shoe/AH8050-001?utm_source=google';

const components = parseUrlComponents(url);
// {
//   href: 'https://nike.com/t/air-max-270-mens-shoe/ah8050-001',
//   encodedHref: 'https%3A%2F%2Fnike.com%2Ft%2Fair-max-270-mens-shoe%2Fah8050-001',
//   hostname: 'nike.com',
//   pathname: '/t/air-max-270-mens-shoe/ah8050-001',
//   search: '',
//   domain: 'nike.com',
//   key: 'abc123_defg4567',  // SHA-1 hash (16 chars, URL-safe)
//   original: 'https://www.nike.com/t/air-max-270-mens-shoe/AH8050-001?utm_source=google'
// }
```

### Tracking Parameter Removal

```typescript
const url = 'https://example.com/product?id=123&utm_source=newsletter&fbclid=xyz&ref=social';
const { href, original } = parseUrlComponents(url);

console.log(original);
// https://example.com/product?id=123&utm_source=newsletter&fbclid=xyz&ref=social
console.log(href);
// https://example.com/product?id=123
```

### Brand Subdomain Preservation

```typescript
const url = 'https://www.oldnavy.gap.com/browse/product.do?pid=123456';
const { domain } = parseUrlComponents(url);

console.log(domain);
// oldnavy.gap.com (preserved, not gap.com)
```

### Multi-Part TLD Handling

```typescript
const url = 'https://www.amazon.co.uk/product/B08N5WRWNW';
const { domain } = parseUrlComponents(url);

console.log(domain);
// amazon.co.uk (not co.uk)
```

## API Reference

### `parseUrlComponents(url)`

Normalizes and parses a URL into structured components.

**Parameters:**

- `url` (string) - The URL to parse and normalize

**Returns:**

- `URLComponents` object:
  - `href` (string) - Normalized URL
  - `encodedHref` (string) - URL-encoded normalized URL
  - `hostname` (string) - Full hostname (e.g., `www.nike.com`)
  - `pathname` (string) - URL path (e.g., `/products/123`)
  - `search` (string) - Query string (e.g., `?color=blue`)
  - `domain` (string) - Normalized domain (e.g., `nike.com`)
  - `key` (string) - SHA-1 based unique key for caching
  - `original` (string) - Original input URL

**Throws:**

- `InvalidUrlError` - If URL is invalid, empty, or uses non-HTTP(S) protocol
- `UrlNormalizationError` - If URL normalization fails
- `DomainParseError` - If domain extraction fails
- `UrlKeyGenerationError` - If key generation fails

### `parseDomain(hostname)`

Extracts the normalized domain from a hostname.

**Parameters:**

- `hostname` (unknown) - Hostname to parse (validated at runtime)

**Returns:**

- `string` - Normalized domain (e.g., `nike.com`)

**Throws:**

- `DomainParseError` - If hostname cannot be parsed

**Behavior:**

- Removes `www` subdomain
- Handles multi-part TLDs (co.uk, com.au, etc.)
- Preserves brand-specific subdomains (oldnavy, athleta, etc.)
- Returns IP addresses as-is

**Examples:**

```typescript
import { parseDomain } from '@rr/url-parser';

parseDomain('www.nike.com'); // 'nike.com'
parseDomain('shop.target.com'); // 'target.com'
parseDomain('www.amazon.co.uk'); // 'amazon.co.uk'
parseDomain('www.oldnavy.gap.com'); // 'oldnavy.gap.com'
parseDomain('192.168.1.1'); // '192.168.1.1' (IP passthrough)
```

### `createUrlKey(baseKey)`

Generates a unique, URL-safe key from a string.

**Parameters:**

- `baseKey` (unknown) - String to hash (validated at runtime)

**Returns:**

- `string` - 16-character URL-safe key

**Throws:**

- `UrlKeyGenerationError` - If key generation fails

**Algorithm:**

1. SHA-1 hash of input string
2. Base64 encode
3. Take first 16 characters
4. Replace `+/=` with `_` and `/` with `-` for URL safety

**Examples:**

```typescript
import { createUrlKey } from '@rr/url-parser';

createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR_'
createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR_' (deterministic)
createUrlKey('nike.com/product/124'); // 'aB1_cD4eF-gH5iJ_' (different input)
createUrlKey(''); // 'J_RKtr_llh3gyr-e' (empty string is valid)
```

## Configuration

### Normalization Rules (`config.ts`)

```typescript
export const config = {
  NORMALIZATION_RULES: {
    defaultProtocol: 'https',
    forceHttps: true,
    stripHash: true,
    stripWWW: true,
    removeTrailingSlash: true,
    sortQueryParameters: true,
    removeQueryParameters: [
      /* 50+ tracking params */
    ],
  },
  PRESERVED_SUBDOMAINS: [
    'oldnavy',
    'bananarepublic',
    'athleta',
    'gap',
    'gapfactory',
    'bananarepublicfactory',
  ],
  PATHNAME_EXTENSIONS: /\.(html?|php|asp|jsp|xml)$/,
};
```

### Removed Tracking Parameters

The library automatically removes 50+ tracking parameters:

**UTM Parameters:**

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

**Platform Tracking:**

- Facebook: `fbclid`, `fb_source`, `fb_ref`
- Google: `gclid`, `gclsrc`, `_ga`, `_gl`
- Microsoft: `msclkid`
- Twitter: `twclid`
- HubSpot: `hsa_acc`, `hsa_cam`, `hsa_grp`, `_hsenc`, `_hsmi`

**Marketing:**

- `ref`, `referral`, `source`, `campaign`, `medium`, `content`, `term`

**Affiliate:**

- `zanpid`, `affid`, `aff_id`, `affiliate`, `cjevent`

**Social Media:**

- `igshid` (Instagram), `mc_cid`, `mc_eid` (Mailchimp)

### Multi-Part TLDs

Domain parsing relies on [`tldts`](https://github.com/remusao/tldts) so every public suffix in the Mozilla list is supported automatically (including `.com.mx`, `.co.in`, etc.). No manual configuration is required beyond the preserved subdomain list.

### Preserved Subdomains

Brand-specific subdomains that are preserved (Gap Inc. brands):

- `oldnavy` → `oldnavy.gap.com`
- `bananarepublic` → `bananarepublic.gap.com`
- `athleta` → `athleta.gap.com`
- `gap` → `gap.com`
- `gapfactory` → `gapfactory.com`
- `bananarepublicfactory` → `bananarepublicfactory.gapfactory.com`

## Testing

```bash
# Run all tests
pnpm --filter @rr/url-parser test

# Run tests in watch mode
pnpm --filter @rr/url-parser test:watch

# Generate coverage report
pnpm --filter @rr/url-parser test:coverage
```

**Test Coverage:** 150 tests across 5 test suites

- `parser.test.ts` - URL component parsing (58 tests)
- `normalization.test.ts` - URL normalization (30 tests)
- `schema.test.ts` - Zod schema validation (51 tests)
- `parse-domain.test.ts` - Domain extraction (6 tests)
- `create-url-key.test.ts` - Key generation (5 tests)

## Examples

### Amazon UK

```typescript
const url = 'https://www.amazon.co.uk/dp/B08N5WRWNW?ref=nav_signin&tag=google';
const { domain, href } = parseUrlComponents(url);
// domain: 'amazon.co.uk'
// href: 'https://amazon.co.uk/dp/b08n5wrwnw'
```

### Gap Brand with Subdomain

```typescript
const url = 'https://www.oldnavy.gap.com/browse/product.do?pid=793168002';
const { domain } = parseUrlComponents(url);
// domain: 'oldnavy.gap.com' (preserved!)
```

### Query Parameter Sorting

```typescript
const url = 'https://example.com/product?c=3&a=1&b=2';
const { search } = parseUrlComponents(url);
// search: '?a=1&b=2&c=3' (sorted)
```

### HTTPS Enforcement

```typescript
const url = 'http://example.com/product';
const { href } = parseUrlComponents(url);
// href: 'https://example.com/product' (forced to HTTPS)
```

### Unique Key Generation

```typescript
const url1 = 'https://nike.com/product/123?utm_source=google';
const url2 = 'https://www.nike.com/product/123/?ref=social';

const key1 = parseUrlComponents(url1).key;
const key2 = parseUrlComponents(url2).key;

console.log(key1 === key2);
// true (same product, different tracking = same key)
```

## Error Handling

The library exports custom error classes for type-safe error handling:

```typescript
import {
  parseUrlComponents,
  InvalidUrlError,
  UrlNormalizationError,
  DomainParseError,
  UrlKeyGenerationError,
} from '@rr/url-parser';

try {
  parseUrlComponents('not a valid url');
} catch (error) {
  if (error instanceof InvalidUrlError) {
    console.error('Invalid URL:', error.url, error.message);
    // InvalidUrlError: Invalid URL format: not a valid url
  } else if (error instanceof UrlNormalizationError) {
    console.error('Normalization failed:', error.url);
  } else if (error instanceof DomainParseError) {
    console.error('Domain parsing failed:', error.hostname);
  } else if (error instanceof UrlKeyGenerationError) {
    console.error('Key generation failed:', error.baseKey);
  }
}
```

### Custom Error Classes

#### `InvalidUrlError`

Thrown when a URL cannot be parsed or is in an invalid format.

```typescript
class InvalidUrlError extends Error {
  constructor(
    public readonly url: string,
    message?: string,
  )
}
```

**Common causes:**
- Empty string or non-string input
- Invalid URL format
- Non-HTTP(S) protocols (javascript:, data:, file:)

#### `UrlNormalizationError`

Thrown when URL normalization fails.

```typescript
class UrlNormalizationError extends Error {
  constructor(
    public readonly url: string,
    message?: string,
  )
}
```

#### `DomainParseError`

Thrown when a domain cannot be extracted from a hostname.

```typescript
class DomainParseError extends Error {
  constructor(
    public readonly hostname: string,
    message?: string,
  )
}
```

#### `UrlKeyGenerationError`

Thrown when URL key generation fails.

```typescript
class UrlKeyGenerationError extends Error {
  constructor(
    public readonly baseKey: string,
    message?: string,
  )
}
```

All error classes include:
- Descriptive error messages
- Contextual data (the input that caused the error)
- Proper error name for debugging
- Full stack traces

## Logging

The library includes structured JSON logging for debugging and observability.

### Default Logger

```typescript
import { logger } from '@rr/url-parser';

// Logger outputs JSON to stdout/stderr
// Automatically suppressed in test environment (NODE_ENV=test)
```

### Custom Logger Instances

Create namespaced loggers for different contexts:

```typescript
import { createLogger } from '@rr/url-parser';

const customLogger = createLogger('my-service.url-processing');

customLogger.debug({ url: 'https://example.com' }, 'Processing URL');
customLogger.info({ domain: 'example.com' }, 'Domain extracted');
customLogger.warn({ issue: 'deprecated' }, 'Using deprecated feature');
customLogger.error({ error: err }, 'Processing failed');
```

### Log Output Format

```json
{
  "level": "info",
  "message": "URL components parsed successfully",
  "context": {
    "domain": "nike.com",
    "key": "xY9_kL3mN-pQ2wR_",
    "namespace": "url-parser.parser"
  },
  "timestamp": "2025-11-24T23:07:56.017Z"
}
```

### Log Levels

- `debug` - Detailed diagnostic information
- `info` - General informational messages
- `warn` - Warning messages for potential issues
- `error` - Error messages for failures

**Note:** Logs are automatically suppressed when `NODE_ENV=test` to keep test output clean.

## TypeScript Support

Full TypeScript support with exported types and schemas:

```typescript
import type { URLComponents, UrlInput, Hostname, BaseKey } from '@rr/url-parser';
import { urlComponentsSchema, urlInputSchema } from '@rr/url-parser';

// Use types for type safety
const components: URLComponents = parseUrlComponents('https://example.com');

// Use schemas for runtime validation
const validated = urlComponentsSchema.parse(components);
```

### Exported Types

- `URLComponents` - Return type of parseUrlComponents
- `UrlInput` - Validated URL string type
- `Hostname` - Validated hostname string type
- `BaseKey` - Validated base key string type
- `PublicUrl` - URL type that blocks private/local IPs

### Exported Schemas (Zod)

- `urlInputSchema` - Validates URL strings (HTTP/HTTPS only)
- `urlComponentsSchema` - Validates parsed URL components
- `hostnameSchema` - Validates hostname strings
- `baseKeySchema` - Validates base key strings
- `publicUrlSchema` - Validates public URLs (blocks localhost, private IPs)

## Dependencies

- `normalize-url` - URL normalization library
- `tldts` - TLD parsing for multi-part domain support
- `zod` - Runtime schema validation and type inference
- `node:crypto` - SHA-1 hashing for key generation

## Use Cases

1. **Product Deduplication**: Generate consistent keys for the same product across different URL variations
2. **Cache Keys**: Use `key` field for Redis caching
3. **Database Storage**: Store normalized URLs to avoid duplicates
4. **Analytics**: Clean URLs before tracking to avoid skewed data
5. **API Requests**: Standardize product URLs before external API calls

## Maintenance

This library is a standalone component designed for independent maintenance. When updating:

1. Add new tracking parameters to `config.NORMALIZATION_RULES.removeQueryParameters`
2. Add new brand subdomains to `config.PRESERVED_SUBDOMAINS`
3. Run full test suite to verify changes
4. Update this README with new examples

## Performance

- **Synchronous**: All operations are synchronous
- **Fast**: Regex-based domain parsing and pre-configured normalization rules
- **Deterministic**: Same input always produces same output
- **Memory Efficient**: Uses Sets for O(1) lookups
- **Optimized Validation**:
  - Development: Full Zod validation (5-10μs per parse)
  - Production: Lightweight native validation (2μs per parse)

## Package Exports

```typescript
// Main functions
export { parseUrlComponents, parseDomain, createUrlKey } from '@rr/url-parser';

// Configuration
export { config } from '@rr/url-parser/config';

// Types and schemas
export type { URLComponents } from '@rr/url-parser';
export { urlComponentsSchema } from '@rr/url-parser';

// Error classes
export {
  InvalidUrlError,
  DomainParseError,
  UrlKeyGenerationError,
  UrlNormalizationError,
} from '@rr/url-parser';

// Logger
export { createLogger, logger } from '@rr/url-parser';
```

## Security

### Protocol Filtering

Only HTTP and HTTPS protocols are allowed. Dangerous protocols are blocked:

```typescript
parseUrlComponents('javascript:alert(1)'); // ✗ InvalidUrlError
parseUrlComponents('data:text/html,<script>'); // ✗ InvalidUrlError
parseUrlComponents('file:///etc/passwd'); // ✗ InvalidUrlError
```

### Public URL Validation (Optional)

Use `publicUrlSchema` to block private/local IP addresses:

```typescript
import { publicUrlSchema } from '@rr/url-parser';

publicUrlSchema.parse('https://example.com'); // ✓ Valid
publicUrlSchema.parse('https://localhost'); // ✗ Throws ZodError
publicUrlSchema.parse('https://192.168.1.1'); // ✗ Throws ZodError
publicUrlSchema.parse('https://169.254.169.254'); // ✗ Blocks AWS metadata
```

## Migration Guide

### Updating from Old Import Paths

```typescript
// Before (old monorepo structure)
import { parseUrlComponents } from '@/lib/parseUrlComponents';

// After (new package structure)
import { parseUrlComponents } from '@rr/url-parser';
```

### Error Handling Updates

```typescript
// Before (generic Error)
try {
  parseUrlComponents(url);
} catch (error) {
  console.error(error.message);
}

// After (custom error classes)
try {
  parseUrlComponents(url);
} catch (error) {
  if (error instanceof InvalidUrlError) {
    // Handle invalid URL specifically
    console.error('Invalid URL:', error.url);
  }
}
```
