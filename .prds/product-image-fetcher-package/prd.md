# Product Image Fetcher Package

## Introduction

A new package (@rr/product-image-fetcher) and product-service API endpoint for fetching product images from merchant URLs. The service accepts storeId, product URL, and image URL, then fetches the image with appropriate headers to avoid bot detection. Images are stored locally initially (phase 1) with S3 storage planned for phase 2. Designed for Lambda execution at up to 1000 RPS spread across hundreds of merchants.

**Last Updated:** 2025-12-10
**Version:** 1.0

## Problem Statement

Our scraped product event data contains image URLs from merchant sites, but we need to fetch and store these images for downstream use (e.g., product catalogs, ML training, user displays). Direct fetching from Lambda without proper headers and error handling results in blocked requests, rate limiting, and unreliable image retrieval. We need a robust solution that handles merchant-specific blocking behaviors, retries appropriately, and provides observability into success/failure rates per merchant.

### Market Opportunity
Reliable product image storage enables: (1) Consistent product display across Rakuten properties without dependency on merchant CDN availability, (2) Image processing pipelines for standardization and optimization, (3) ML/AI training data for product recognition, (4) Faster page loads by serving from our own CDN, (5) Analytics on product imagery trends.

### Target Users
- Internal Rakuten services consuming normalized product data
- Product catalog teams needing reliable image assets
- ML/AI teams requiring product image datasets
- Frontend applications displaying product information

## Solution Overview

Create @rr/product-image-fetcher package with: (1) Lightweight fetch with configurable User-Agent and Referer headers, (2) Support for common image formats (JPEG, PNG, WebP) excluding GIF, (3) Response validation (content-type, size limits), (4) Error categorization (permanent failures vs retriable), (5) Per-domain metrics and logging. Expose via product-service API endpoint with OpenAPI documentation. Phase 1 stores images locally; Phase 2 adds S3 storage and format conversion.

### Key Features
- Fetch images with custom User-Agent and Referer headers to reduce bot detection
- Configurable supported image formats (JPEG, PNG, WebP) with GIF exclusion
- Error categorization: permanent (401/403/404) vs retriable (429/5xx) failures
- Per-domain status code logging for observability and merchant analysis
- Content-type and file size validation before storage
- Local file storage (phase 1) with S3-ready architecture
- Lambda-optimized with /tmp storage and memory considerations
- Rate limiting awareness with exponential backoff for 429 responses

### Success Metrics
- Image fetch success rate >85% across supported merchants
- P99 latency <3s for successful image fetches
- Clear identification of merchants requiring special handling (whitelisting, throttling)
- Zero Lambda timeout errors from image fetching
- <5% permanent failure rate for valid image URLs
- Per-merchant success/failure dashboards operational

## User Stories

### Priority P0

#### US001: Submit A Storeid, Product ⏳ [M]

**User Story:** As a product-service API consumer, I want to submit a storeId, product URL, and image URL to fetch and store the product image so that I can reliably retrieve product images without worrying about merchant blocking or rate limiting

**Business Value:** I can reliably retrieve product images without worrying about merchant blocking or rate limiting

**Acceptance Criteria:**
- API accepts POST request with storeId, productUrl, and imageUrl fields
- Returns success response with stored image path/identifier
- Returns appropriate error response for failed fetches with error categorization
- Validates image URL format before attempting fetch
- Logs request with storeId for per-merchant analytics

#### US002: Receive Clear Error Categorization ⏳ [M]

**User Story:** As a product-service API consumer, I want to receive clear error categorization when image fetch fails so that I can distinguish between permanent failures (don't retry) and temporary failures (retry later)

**Business Value:** I can distinguish between permanent failures (don't retry) and temporary failures (retry later)

**Acceptance Criteria:**
- 401/403/404 errors return isPermanent: true flag
- 429/5xx errors return isPermanent: false with retryAfter hint if available
- Network timeouts return isPermanent: false
- Invalid content-type returns isPermanent: true
- Error response includes HTTP status code and merchant domain

#### US003: View Per-merchant Success/failure Metrics ⏳ [M]

**User Story:** As a operations engineer, I want to view per-merchant success/failure metrics so that I can identify which merchants are blocking requests and need special handling or whitelisting

**Business Value:** I can identify which merchants are blocking requests and need special handling or whitelisting

**Acceptance Criteria:**
- Logs include storeId and merchant domain on every request
- Logs include HTTP status code for all responses
- Logs include response time for latency analysis
- Failed requests include error category (permanent/retriable)
- Structured JSON logging compatible with CloudWatch Logs Insights

#### US007: Fetch Images With Appropriate ⏳ [M]

**User Story:** As a Lambda runtime, I want to fetch images with appropriate headers to avoid bot detection so that merchant servers are less likely to block requests

**Business Value:** merchant servers are less likely to block requests

**Acceptance Criteria:**
- Request includes realistic User-Agent header (Chrome-like)
- Request includes Referer header set to productUrl parameter
- Request includes Accept header for image types
- Headers are configurable per-merchant if needed
- Connection timeout set appropriately for Lambda (default 10s)

### Priority P1

#### US004: Have Invalid Image Formats ⏳ [M]

**User Story:** As a product-service API consumer, I want to have invalid image formats rejected before fetch attempt so that I don't waste resources fetching unsupported formats like GIFs

**Business Value:** I don't waste resources fetching unsupported formats like GIFs

**Acceptance Criteria:**
- Image URL file extension is validated against allowed list (jpg, jpeg, png, webp)
- GIF URLs are rejected with clear error message
- URLs without extension are allowed (content-type validated after fetch)
- Configuration allows customizing supported formats
- Rejection happens before any network request is made

#### US005: Have Fetched Images Validated ⏳ [M]

**User Story:** As a product-service API consumer, I want to have fetched images validated for content-type and size so that I only store valid images within acceptable size limits

**Business Value:** I only store valid images within acceptable size limits

**Acceptance Criteria:**
- Response content-type must be image/jpeg, image/png, or image/webp
- Maximum image size configurable (default 10MB)
- Minimum image size configurable to reject placeholder pixels (default 1KB)
- Invalid content-type returns permanent failure
- Oversized images return permanent failure with size in error

#### US006: Have Images Stored With ⏳ [M]

**User Story:** As a product-service API consumer, I want to have images stored with deterministic paths based on input so that I can deduplicate requests and locate stored images predictably

**Business Value:** I can deduplicate requests and locate stored images predictably

**Acceptance Criteria:**
- Storage path includes storeId for organization
- Filename derived from image URL hash for deduplication
- File extension matches actual content-type
- Path structure: {storeId}/{hash}.{ext}
- Same input always produces same output path

#### US008: Handle Image Storage Within ⏳ [M]

**User Story:** As a Lambda runtime, I want to handle image storage within Lambda constraints so that the function operates reliably within Lambda's /tmp limits and memory

**Business Value:** the function operates reliably within Lambda's /tmp limits and memory

**Acceptance Criteria:**
- Phase 1: Write to local filesystem (repo folder for testing)
- Lambda mode: Use /tmp directory with 512MB-10GB ephemeral storage
- Stream response to disk instead of buffering in memory
- Clean up /tmp after successful S3 upload (phase 2)
- Configurable storage backend via environment variable

#### US009: Submit Multiple Image Fetch ⏳ [M]

**User Story:** As a product-service API consumer, I want to submit multiple image fetch requests in a single API call so that I can efficiently process batches of product images with reduced HTTP overhead

**Business Value:** I can efficiently process batches of product images with reduced HTTP overhead

**Acceptance Criteria:**
- API accepts array of image fetch requests (max 100 per batch)
- Returns array of results maintaining input order
- Each result indicates success or failure independently
- Batch processing does not fail entirely if one image fails
- Summary statistics included (total, successful, failed)


## Progress

**Overall:** 0% (0/9 stories)

---

*Approver: TBD*
