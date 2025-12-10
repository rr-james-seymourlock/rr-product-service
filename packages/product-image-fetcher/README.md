# @rr/product-image-fetcher

Fetch and store product images from merchant URLs with bot detection avoidance and error categorization.

## Overview

### What it does

The product image fetcher downloads product images from e-commerce merchant URLs and stores them locally (phase 1) or in S3 (phase 2). It uses appropriate HTTP headers (User-Agent, Referer) to reduce bot detection and categorizes errors as permanent (don't retry) or retriable (retry with backoff).

### Why it exists

Scraping product data from merchant sites often includes image URLs, but fetching these images directly has challenges:

- **Bot detection** - Merchants block requests without proper headers
- **Rate limiting** - High-volume fetching triggers 429 responses
- **Inconsistent availability** - Merchant CDNs may be slow or unavailable
- **Error handling** - Need to distinguish between "try again later" and "never retry"

This package provides:

```
Image URL → fetchAndStoreImages() → Local/S3 Storage
                (@rr/product-image-fetcher)
                        ↓
              - Custom User-Agent/Referer headers
              - Content-type validation (from response, not URL)
              - Error categorization (permanent vs retriable)
              - Per-domain metrics for merchant analysis
```

### Where it's used

**Product Service API:**
- `POST /images/fetch` - Batch image fetching endpoint (1-100 images per request)

**Future integration:**
- Product event normalization pipeline
- Automated product catalog building
- ML/AI training data collection

### When to use it

Use this package when you need to:
- Fetch product images from merchant websites
- Store images with deterministic, deduplicated paths
- Handle merchant-specific blocking and rate limiting
- Track success/failure rates per merchant domain
- Distinguish between permanent and retriable failures

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Request Headers Strategy

### Why User-Agent and Referer Matter

Merchant CDNs and image servers use various signals to distinguish legitimate traffic from bots. Requests without proper headers are often blocked or rate-limited aggressively. This package uses two key headers to present as quality traffic:

#### User-Agent Header

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

**Why it helps:**
- **Bot detection systems** (Cloudflare, Akamai, etc.) flag requests with missing or generic User-Agents
- **CDN caching** may serve different content based on User-Agent (mobile vs desktop, WebP support)
- **Quality signal** - A realistic browser User-Agent indicates the request originates from a legitimate browsing context
- **Reduced blocking** - Many merchants whitelist common browser User-Agents while blocking `curl`, `python-requests`, or empty User-Agents

#### Referer Header

The Referer is set to the `productUrl` parameter (the product page containing the image):

```
Referer: https://www.macys.com/shop/product/12345
```

**Why it helps:**
- **Hotlink protection** - Many CDNs check that image requests come from their own domain pages
- **Traffic validation** - A Referer from the same merchant domain indicates the request is part of normal page loading
- **Anti-scraping measures** - Requests without Referer are often flagged as automated/bot traffic
- **Analytics accuracy** - Helps merchants understand traffic patterns (though we're not their primary concern)

#### Combined Effect

Together, these headers make our requests appear as if they're coming from a user's browser viewing a product page:

```
Real browser loading image:
  GET /image.jpg
  User-Agent: Chrome/120...
  Referer: https://merchant.com/product-page

Our requests (mimicking browser):
  GET /image.jpg
  User-Agent: Chrome/120...
  Referer: https://merchant.com/product-page  ← from productUrl parameter
```

This significantly reduces 403 Forbidden responses and improves success rates across merchants.

### Per-Merchant Analysis

When images fail to fetch, structured logs include the domain, enabling analysis of which merchants have stricter protections:

```json
{
  "domain": "images.merchant.com",
  "storeId": "12345",
  "statusCode": 403,
  "isPermanent": true
}
```

This data helps identify merchants that may need:
- IP whitelisting arrangements
- Alternative image sources
- Special handling or throttling

## Features

- **Bot detection avoidance** - Realistic User-Agent and Referer headers
- **Content-type validation** - Validates response content-type, not URL extension (CDNs serve different formats)
- **Supported formats** - JPEG, PNG, WebP (GIF excluded)
- **Error categorization** - Permanent (401/403/404) vs retriable (429/5xx) failures
- **Deterministic storage** - SHA-256 hash-based paths for deduplication
- **Batch processing** - Process multiple images with configurable concurrency
- **Lambda optimized** - Uses /tmp storage, configurable limits
- **Structured logging** - JSON logs with domain/storeId for analytics
- **Type-safe** - Full TypeScript with Zod validation

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { fetchAndStoreImages } from '@rr/product-image-fetcher';
```

## Usage

### Basic Example

```typescript
import { fetchAndStoreImages } from '@rr/product-image-fetcher';

const results = await fetchAndStoreImages([
  {
    storeId: '8333',
    productUrl: 'https://www.macys.com/shop/product/12345',
    imageUrl: 'https://slimages.macysassets.com/is/image/MCY/products/2/optimized/31898232_fpx.tif',
  },
]);

// Results maintain input order
for (const result of results) {
  if (result.success) {
    console.log('Stored at:', result.storagePath);
    console.log('Content-Type:', result.contentType);
    console.log('Size:', result.sizeBytes);
  } else {
    console.log('Error:', result.error.code, result.error.message);
    console.log('Permanent failure:', result.error.isPermanent);
  }
}
```

### Batch Processing

```typescript
const requests = [
  { storeId: '8333', productUrl: 'https://macys.com/p/1', imageUrl: 'https://example.com/img1.jpg' },
  { storeId: '9528', productUrl: 'https://nike.com/p/2', imageUrl: 'https://example.com/img2.png' },
  { storeId: '5246', productUrl: 'https://target.com/p/3', imageUrl: 'https://example.com/img3.webp' },
];

const results = await fetchAndStoreImages(requests);

const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`${successful.length} succeeded, ${failed.length} failed`);
```

### Error Handling

```typescript
import { fetchAndStoreImages, type ImageFetchResult } from '@rr/product-image-fetcher';

const results = await fetchAndStoreImages(requests);

for (const result of results) {
  if (!result.success) {
    const { error } = result;

    if (error.isPermanent) {
      // Don't retry: 401, 403, 404, invalid content-type, oversized
      console.log(`Permanent failure (${error.code}): ${error.message}`);
    } else {
      // Retry later: 429, 5xx, network errors, timeouts
      console.log(`Retriable failure (${error.code}): ${error.message}`);

      if (error.retryAfter) {
        console.log(`Retry after ${error.retryAfter} seconds`);
      }
    }
  }
}
```

### With Custom Options

```typescript
import { fetchAndStoreImages, type ImageFetcherOptions } from '@rr/product-image-fetcher';

const options: ImageFetcherOptions = {
  timeoutMs: 5000,           // 5 second timeout (default: 10s)
  minSizeBytes: 2048,        // Minimum 2KB (default: 1KB)
  maxSizeBytes: 5_000_000,   // Maximum 5MB (default: 10MB)
  storagePath: '/custom/path', // Override storage location
};

const results = await fetchAndStoreImages(requests, options);
```

## API Reference

### `fetchAndStoreImages(requests, options?)`

Fetches multiple images and stores them locally.

**Parameters:**
- `requests` (ImageFetchRequest[]) - Array of image fetch requests:
  - `storeId` (string) - Rakuten store ID for organization
  - `productUrl` (string) - Product page URL (used as Referer header)
  - `imageUrl` (string) - Image URL to fetch
- `options` (ImageFetcherOptions, optional) - Configuration overrides

**Returns:**
- `Promise<ImageFetchResult[]>` - Array of results maintaining input order

**Example:**

```typescript
const results = await fetchAndStoreImages([
  {
    storeId: '8333',
    productUrl: 'https://www.macys.com/shop/product/12345',
    imageUrl: 'https://slimages.macysassets.com/is/image/MCY/products/img.tif',
  },
]);
```

### `fetchAndStoreImage(request, options?)`

Fetches a single image and stores it. Used internally by `fetchAndStoreImages`.

**Parameters:**
- `request` (ImageFetchRequest) - Single image fetch request
- `options` (ImageFetcherOptions, optional) - Configuration overrides

**Returns:**
- `Promise<ImageFetchResult>` - Success or failure result

## Types

### ImageFetchRequest

```typescript
interface ImageFetchRequest {
  storeId: string;     // Rakuten store ID
  productUrl: string;  // Product page URL (used as Referer)
  imageUrl: string;    // Image URL to fetch
}
```

### ImageFetchResult

```typescript
// Success result
interface ImageFetchSuccess {
  success: true;
  storagePath: string;   // e.g., '8333/a1b2c3d4e5f6g7h8.jpg'
  contentType: string;   // e.g., 'image/jpeg'
  sizeBytes: number;     // File size in bytes
  domain: string;        // Image URL domain
}

// Failure result
interface ImageFetchFailure {
  success: false;
  error: {
    code: string;        // Error code (see Error Codes below)
    message: string;     // Human-readable message
    isPermanent: boolean; // true = don't retry, false = retry later
    statusCode?: number; // HTTP status code if applicable
    retryAfter?: number; // Seconds to wait before retry (429 responses)
    domain: string;      // Image URL domain
  };
}

type ImageFetchResult = ImageFetchSuccess | ImageFetchFailure;
```

### ImageFetcherOptions

```typescript
interface ImageFetcherOptions {
  timeoutMs?: number;      // Request timeout (default: 10000)
  minSizeBytes?: number;   // Minimum image size (default: 1024)
  maxSizeBytes?: number;   // Maximum image size (default: 10485760)
  userAgent?: string;      // Custom User-Agent header
  storagePath?: string;    // Override storage base path
}
```

## Error Codes

### Permanent Errors (don't retry)

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | HTTP 401 - Authentication required |
| `FORBIDDEN` | HTTP 403 - Access denied |
| `NOT_FOUND` | HTTP 404 - Image not found |
| `INVALID_CONTENT_TYPE` | Response is not JPEG/PNG/WebP |
| `SIZE_TOO_SMALL` | Image smaller than minimum (likely placeholder) |
| `SIZE_TOO_LARGE` | Image exceeds maximum size limit |

### Retriable Errors (retry with backoff)

| Code | Description |
|------|-------------|
| `RATE_LIMITED` | HTTP 429 - Too many requests (check retryAfter) |
| `SERVER_ERROR` | HTTP 5xx - Server error |
| `NETWORK_ERROR` | Connection failed |
| `TIMEOUT` | Request timed out |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `IMAGE_STORAGE_PATH` | `.tmp/fetched-images` | Base storage path |
| `IMAGE_FETCH_TIMEOUT_MS` | `10000` | Request timeout |
| `IMAGE_MIN_SIZE_BYTES` | `1024` | Minimum image size |
| `IMAGE_MAX_SIZE_BYTES` | `10485760` | Maximum image size |
| `IMAGE_USER_AGENT` | Chrome UA | Custom User-Agent |
| `IMAGE_BATCH_CONCURRENCY` | `10` | Concurrent fetches |

### Storage Paths

**Local development:**
```
.tmp/fetched-images/{storeId}/{hash}.{ext}
```

**Lambda:**
```
/tmp/fetched-images/{storeId}/{hash}.{ext}
```

The hash is the first 16 characters of SHA-256(imageUrl), ensuring:
- Same URL always produces same path (deduplication)
- No collisions in practice
- Safe filesystem characters

## Logging

Structured JSON logging via `@rr/shared/utils`:

```json
{
  "level": "info",
  "message": "Image fetched successfully",
  "storeId": "8333",
  "domain": "slimages.macysassets.com",
  "contentType": "image/jpeg",
  "sizeBytes": 45678,
  "durationMs": 234,
  "namespace": "product-image-fetcher"
}
```

### Log Levels

- **debug** - Request details, storage paths
- **info** - Successful fetches, metrics
- **warn** - Retriable failures
- **error** - Permanent failures, unexpected errors

## Testing

```bash
# Run all tests
pnpm --filter @rr/product-image-fetcher test

# Run tests in watch mode
pnpm --filter @rr/product-image-fetcher test:watch

# Type checking
pnpm --filter @rr/product-image-fetcher typecheck
```

**Test Coverage:**
- `validation.test.ts` - Content-type and size validation
- `errors.test.ts` - Error categorization and factory functions
- `storage.test.ts` - Path generation and file operations

## Content-Type Validation

**Important**: This package validates the response `Content-Type` header, NOT the URL file extension.

CDNs commonly serve different formats than the URL suggests:
- `.tif` URL → `image/jpeg` response (Adobe Scene7)
- `.png` URL → `image/jpeg` response (Cloudinary with `f_auto`)

```typescript
// This .tif URL actually returns image/jpeg
const results = await fetchAndStoreImages([{
  storeId: '8333',
  productUrl: 'https://macys.com/product/123',
  imageUrl: 'https://slimages.macysassets.com/image.tif', // Returns image/jpeg!
}]);

// Stored as .jpg based on actual content-type
console.log(results[0].storagePath); // '8333/abc123def456.jpg'
```

## Performance

- **Cold start:** < 1ms (minimal initialization)
- **Per request:** 100-3000ms (network dependent)
- **Batch throughput:** ~10 concurrent fetches (configurable)
- **Memory:** Streams to disk, minimal buffering

## Dependencies

- `@rr/shared` - Shared utilities (logger)
- `zod` - Runtime validation

**No external HTTP dependencies** - Uses native Node.js fetch (Node 18+)

## Future Enhancements (Phase 2)

1. **S3 Storage** - Upload to S3 after local fetch
2. **Format Conversion** - Convert to standard format (WebP)
3. **Image Optimization** - Resize/compress for different use cases
4. **Caching** - Skip re-fetching existing images
5. **Circuit Breaker** - Per-domain failure thresholds
