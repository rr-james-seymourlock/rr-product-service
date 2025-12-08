# Product ID Extractor Package

## Introduction

A modular TypeScript package ecosystem that extracts product identifiers (GTINs, SKUs, ASINs, etc.) from raw merchant URLs. Split across three packages (@rr/product-id-extractor, @rr/store-registry, @rr/url-parser) for clear separation of concerns. Designed as a shared library for internal services with an HTTP API endpoint, supporting 1000+ RPS with store-specific and generic extraction patterns.

**Last Updated:** 2025-12-08
**Version:** 1.0

## Problem Statement

Internal services need to match merchant product URLs to our product catalog, but product IDs are embedded in URLs in countless formats: path segments, query parameters, encoded values, and store-specific patterns. Without a centralized, well-tested extraction library, each service would implement its own fragile parsing logic, leading to inconsistent results, duplicated effort, and maintenance nightmares. We need a single source of truth for URL-to-productId extraction that handles our merchant network.

### Market Opportunity
This package enables all downstream services (catalog matching, analytics, affiliate tracking) to reliably extract product identifiers. Currently supporting 81 configured stores with patterns for major retailers. A shared package reduces development time for new services and ensures consistent behavior across the platform.

### Target Users
- Internal service developers importing the package for product matching workflows
- API consumers needing ad-hoc URL analysis via HTTP endpoint
- Integration engineers adding new merchant configurations
- QA engineers validating extraction accuracy across merchants

## Solution Overview

A modular package ecosystem: @rr/url-parser handles URL normalization and parsing, @rr/store-registry manages store configurations with O(1) lookups, and @rr/product-id-extractor performs pattern-based extraction. Store configs map internal storeIds to domains and define store-specific pathname patterns. A generic search pattern extracts IDs from common query parameters (sku, pid, productId, etc.). The packages use safe regex (ts-regex-builder) with timeout protection. The HTTP API at POST /product-identifiers/urls exposes the functionality with batch support (1-100 URLs). The architecture prioritizes: O(1) store lookups via pre-compiled Maps, immutable frozen configs, comprehensive test coverage (40+ store fixtures), and sub-millisecond extraction times.

### Key Features
- Core extraction function: extractIdsFromUrlComponents() with typed input/output
- Store-specific pathname pattern matching with capture group extraction
- Generic search pattern supporting sku, pid, productId, skuid, athcpid, upc_id, variant, prdtno params
- Generic pathname fallback patterns for /product/, /p/, /prod/, /prd/ URL structures
- Safe regex via ts-regex-builder preventing ReDoS vulnerabilities
- Timeout protection (100ms) checking every 5 iterations, max 12 results per URL
- Frozen immutable output arrays preventing mutation in Lambda warm containers
- HTTP API at POST /product-identifiers/urls with batch support (1-100 URLs per request)
- Comprehensive test suite with 40+ store fixtures and regex security validation
- Integrates with @rr/store-registry for store config lookups (see store-registry PRD)

### Success Metrics
- 95%+ extraction success rate for URLs from configured stores
- Sub-1ms extraction time for warm calls (excluding network)
- Support 1000+ RPS via Lambda API with <10ms p99 latency
- 97%+ code coverage across all packages
- Zero ReDoS vulnerabilities (validated by safe-regex tooling)
- New store onboarding in <30 minutes with pattern testing
- 81 stores currently configured with room for expansion

## User Stories

### Priority P0

#### US001: Extract Product IDs via Package Import ✅ [M]

**User Story:** As a service developer, I want to import the package and extract product IDs from a URL so that I can integrate product ID extraction into my service without implementing parsing logic myself

**Business Value:** I can integrate product ID extraction into my service without implementing parsing logic myself

**Acceptance Criteria:**
- Package exports extractIdsFromUrlComponents(input: ExtractIdsInput) function
- Input accepts urlComponents from @rr/url-parser and optional storeId
- Function returns { productIds: readonly string[], storeId?: string }
- productIds array is frozen, sorted, deduplicated, max 12 items
- TypeScript types and Zod schemas exported for all inputs and outputs
- Development mode validates input/output with Zod, production skips for performance

#### US002: Extract Product IDs from URL Pathnames ✅ [M]

**User Story:** As a service developer, I want to extract product IDs from URL path segments using store-specific patterns so that I can capture IDs embedded in paths like /product/ABC123 or /p/12345.html

**Business Value:** I can capture IDs embedded in paths like /product/ABC123 or /p/12345.html

**Acceptance Criteria:**
- patternExtractor() function applies regex patterns to URL pathname
- Patterns use capture groups 1 and 2 for ID extraction
- Multiple patterns tried in priority order until match found
- Store-specific patterns from @rr/store-registry applied first
- Generic fallback patterns (/product/, /p/, /prod/, /prd/) when no store match
- Extracted IDs deduplicated via Set, sorted, and frozen

#### US003: Extract Product IDs from Query Parameters ✅ [M]

**User Story:** As a service developer, I want to extract product IDs from URL query parameters so that I can capture IDs in query strings like ?productId=123 or ?sku=ABC

**Business Value:** I can capture IDs in query strings like ?productId=123 or ?sku=ABC

**Acceptance Criteria:**
- Generic search pattern extracts from common param names: sku, pid, id, productid, skuid, athcpid, upc_id, variant, prdtno
- Store-specific searchPatterns can override generic extraction
- ID values must be 4-24 characters, alphanumeric with dashes
- Query param extraction runs after pathname extraction
- Results merged and deduplicated with pathname results

#### US005: Timeout Protection for Regex Extraction ✅ [M]

**User Story:** As a service developer, I want extraction to timeout if regex takes too long so that I am protected from ReDoS attacks and runaway patterns that could hang my service

**Business Value:** I am protected from ReDoS attacks and runaway patterns that could hang my service

**Acceptance Criteria:**
- PATTERN_EXTRACTOR_TIMEOUT_MS = 100ms timeout for extraction operations
- Timeout checked every 5 iterations (optimized to reduce syscalls)
- PATTERN_EXTRACTOR_MAX_RESULTS = 12 limits results per URL
- Warning logged when timeout occurs with duration and source length
- Regex lastIndex reset in finally block to prevent state issues
- safe-regex dev dependency validates patterns for catastrophic backtracking

#### US007: Comprehensive Test Suite ✅ [M]

**User Story:** As a QA engineer, I want to run comprehensive tests validating extraction accuracy per store so that I can verify that patterns correctly extract IDs from real merchant URLs

**Business Value:** I can verify that patterns correctly extract IDs from real merchant URLs

**Acceptance Criteria:**
- 40+ JSON fixture files in __fixtures__/ with real URLs and expected IDs
- 8 test files covering extractor, error handling, paths, query params, regex security
- Concurrent fixture tests via describe.concurrent and test.concurrent.each
- Regex security tests validate: global flag, lowercase patterns, safe-regex check
- Performance benchmarks for pathname patterns, search pattern, all store patterns
- 97%+ code coverage across all extraction packages
- Test utilities: assertProductIdsMatch(), storeFixtureTestCases

### Priority P1

#### US004: Apply Generic Fallback Patterns ✅ [M]

**User Story:** As a service developer, I want to apply generic fallback patterns when no store-specific config exists so that I can still extract likely product IDs from unknown merchants using common URL conventions

**Business Value:** I can still extract likely product IDs from unknown merchants using common URL conventions

**Acceptance Criteria:**
- Generic pathname patterns match /prod/, /prd/, /p/ prefixed IDs (6-24 digits)
- Generic patterns match numeric IDs at end of URL paths
- Fallback runs when store-specific extraction yields no results
- Generic patterns require 6+ digit IDs to avoid false positives
- Generic search pattern always runs for query parameter extraction

#### US006: HTTP API Endpoint for URL Analysis ✅ [M]

**User Story:** As an API consumer, I want to call an HTTP endpoint to extract product IDs without importing the package so that I can use the extraction service from non-Node environments or as a quick integration

**Business Value:** I can use the extraction service from non-Node environments or as a quick integration

**Acceptance Criteria:**
- POST /product-identifiers/urls endpoint accepts array of URLs
- Request body: { urls: [{ url: string, storeId?: string }] }
- Response includes results array with productIds, storeId, count, success per URL
- Response includes summary: total, successful, failed counts
- Batch supports 1-100 URLs per request with parallel processing
- URL validation blocks localhost, private IPs, metadata endpoints
- Zod schema validation with detailed error messages
- Middy middleware: httpJsonBodyParser, httpErrorHandler


## Progress

**Overall:** 100% (7/7 stories)

---

*Approver: TBD*
