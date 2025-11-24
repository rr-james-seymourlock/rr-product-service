# parseUrlComponents

A robust URL parsing and normalization library that processes e-commerce URLs into standardized components for consistent product identification and data storage.

## Purpose

Normalizes and parses URLs into structured components, removing tracking parameters, standardizing protocols, and extracting domain information. Generates unique keys for caching and database storage.

## Features

- **URL Normalization**: Removes tracking parameters, forces HTTPS, strips WWW
- **Domain Parsing**: Handles multi-part TLDs (co.uk, com.au) and brand subdomains
- **Unique Key Generation**: Creates SHA-1 based keys for Redis/DynamoDB
- **Comprehensive Tracking Removal**: Strips 50+ UTM, marketing, and platform-specific parameters
- **Brand Subdomain Preservation**: Maintains Gap, Old Navy, Banana Republic subdomains
- **Error Handling**: Clear error messages with context for debugging

## Installation

This library is internal to the rr-product-service project.

```typescript
import { parseUrlComponents } from '@/lib/parseUrlComponents';
```

## Usage

### Basic Example

```typescript
import { parseUrlComponents } from '@/lib/parseUrlComponents';

const url = 'https://www.nike.com/t/air-max-270-mens-shoe/AH8050-001?utm_source=google';

const components = parseUrlComponents(url);
// {
//   href: 'https://nike.com/t/air-max-270-mens-shoe/ah8050-001',
//   encodedHref: 'https%3A%2F%2Fnike.com%2Ft%2Fair-max-270-mens-shoe%2Fah8050-001',
//   hostname: 'nike.com',
//   pathname: '/t/air-max-270-mens-shoe/ah8050-001',
//   search: '',
//   domain: 'nike.com',
//   key: 'abc123_defg4567',  // SHA-1 hash
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

- `Error` - If URL cannot be parsed or normalized

### `parseDomain(hostname)`

Extracts the normalized domain from a hostname.

**Parameters:**

- `hostname` (string) - Hostname to parse (e.g., `www.shop.nike.com`)

**Returns:**

- `string` - Normalized domain (e.g., `nike.com`)

**Behavior:**

- Removes `www` subdomain
- Handles multi-part TLDs (co.uk, com.au, etc.)
- Preserves brand-specific subdomains (oldnavy, athleta, etc.)

**Examples:**

```typescript
parseDomain('www.nike.com'); // 'nike.com'
parseDomain('shop.target.com'); // 'target.com'
parseDomain('www.amazon.co.uk'); // 'amazon.co.uk'
parseDomain('www.oldnavy.gap.com'); // 'oldnavy.gap.com'
```

### `createUrlKey(baseKey)`

Generates a unique, URL-safe key from a string.

**Parameters:**

- `baseKey` (string) - String to hash (typically `${domain}${pathname}${search}`)

**Returns:**

- `string` - 16-character URL-safe key

**Algorithm:**

1. SHA-1 hash of input string
2. Base64 encode
3. Take first 16 characters
4. Replace `+/=` with `_` for URL safety

**Examples:**

```typescript
createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR'
createUrlKey('nike.com/product/123'); // 'xY9_kL3mN-pQ2wR' (same input = same key)
createUrlKey('nike.com/product/124'); // 'aB1_cD4eF-gH5iJ' (different)
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
npm test -- parseUrlComponents
```

**Test Coverage:**

- `normalizeUrl.test.ts` - URL normalization (30 tests)
- `parseDomain.test.ts` - Domain extraction (6 tests)
- `createUrlKey.test.ts` - Key generation (5 tests)

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

## Dependencies

- `normalize-url` - URL normalization library
- `node:crypto` - SHA-1 hashing for key generation

## Error Handling

The library throws descriptive errors with context:

```typescript
try {
  parseUrlComponents('not a valid url');
} catch (error) {
  console.error(error.message);
  // Failed to parse URL components for "not a valid url": Invalid URL
}
```

All errors include:

- The function that failed
- The problematic input
- The underlying error message

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

## Future Enhancements

- Configurable subdomain preservation rules
- URL validation before parsing
- Batch URL processing API
- Custom normalization profiles per domain
