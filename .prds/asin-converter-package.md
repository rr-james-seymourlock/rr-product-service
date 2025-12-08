# ASIN Converter Package

## Introduction

A TypeScript package (@rr/asin-converter) that converts Amazon ASIN (Amazon Standard Identification Number) identifiers to universal product identifiers (UPC, SKU, MPN) via the Synccentric product database API. Includes an HTTP API endpoint (POST /product-identifiers/asins) for batch ASIN conversion with parallel processing and granular error handling.

**Last Updated:** 2025-12-08
**Version:** 1.0

## Problem Statement

Amazon ASINs are proprietary identifiers that cannot be used to match products across other retailers or internal catalogs. To enable cross-retailer product matching, analytics, and inventory integration, we need to convert ASINs to standard identifiers like UPC (Universal Product Code), SKU, or MPN (Manufacturer Part Number). Without this conversion capability, Amazon product data remains siloed and cannot participate in multi-retailer workflows.

### Market Opportunity
Amazon is the largest e-commerce platform, and many Rakuten merchants also sell on Amazon. Converting ASINs to universal identifiers enables: cross-retailer price comparison, unified product catalogs, affiliate tracking across platforms, and inventory synchronization. The Synccentric API provides access to a comprehensive product database mapping ASINs to standard identifiers.

### Target Users
- Product matching services needing universal identifiers from Amazon URLs
- Analytics pipelines correlating Amazon products with other retailers
- Inventory systems synchronizing stock across Amazon and other channels
- Affiliate tracking systems matching Amazon conversions to universal products

## Solution Overview

A standalone package that wraps the Synccentric product database API with TypeScript types, Zod validation, comprehensive error handling, and structured logging. The convertAsins() function accepts an array of ASINs and returns matched UPC/SKU/MPN identifiers. Five custom error classes cover all failure scenarios (InvalidInput, Configuration, ApiRequest, ApiResponse, ProductNotFound). An HTTP endpoint at POST /product-identifiers/asins provides batch conversion with parallel processing, returning per-item success/failure results. The endpoint supports 1-10 ASINs per request with 10-second timeout protection.

### Key Features
- convertAsins() function converting ASIN array to {upc?, sku?, mpn?} identifiers
- Synccentric API integration with Bearer token authentication
- 5 custom error classes: InvalidInputError, ConfigurationError, ApiRequestError, ApiResponseError, ProductNotFoundError
- Zod schemas for input validation and API response parsing
- 10-second timeout protection via AbortController
- HTTP endpoint POST /product-identifiers/asins with batch support (1-10 ASINs)
- Parallel processing of ASINs with per-item error isolation
- Partial success handling - one ASIN failure doesn't block others
- Structured JSON logging with request context
- 42 comprehensive tests covering all success and error paths

### Success Metrics
- Successfully convert ASINs to identifiers when product exists in Synccentric
- Return appropriate ProductNotFoundError when ASIN not in database
- Handle API timeouts gracefully within 10-second limit
- Process batch of 10 ASINs in parallel with <2 second total response time
- 100% test coverage for converter logic and error handling
- Zero unhandled exceptions - all errors mapped to specific error classes

## User Stories

### Priority P0

#### US001: Convert An Amazon Asin ✅ [M]

**User Story:** As a service developer, I want to convert an Amazon ASIN to universal product identifiers so that I can match Amazon products with items in our catalog and other retailers

**Business Value:** I can match Amazon products with items in our catalog and other retailers

**Acceptance Criteria:**
- convertAsins(asins, config) accepts array of ASIN strings
- Config requires host (Synccentric URL) and authKey (Bearer token)
- Returns { upc?: string, sku?: string, mpn?: string } with matched identifiers
- Empty/undefined identifiers filtered from response
- TypeScript types exported for all inputs and outputs

#### US002: Catch Specific Errors When ✅ [L]

**User Story:** As a service developer, I want to catch specific errors when ASIN conversion fails so that I can handle different failure scenarios appropriately in my service

**Business Value:** I can handle different failure scenarios appropriately in my service

**Acceptance Criteria:**
- InvalidInputError thrown for empty array or invalid ASIN format
- ConfigurationError thrown for missing host or authKey
- ApiRequestError thrown for network failures or non-200 status (includes statusCode)
- ApiResponseError thrown for invalid JSON or schema mismatch
- ProductNotFoundError thrown when ASIN not in Synccentric database (includes asins array)
- All errors extend base AsinConverterError class

#### US003: Have Requests Timeout If ✅ [M]

**User Story:** As a service developer, I want to have requests timeout if Synccentric API is slow so that my service doesn't hang waiting for unresponsive external APIs

**Business Value:** my service doesn't hang waiting for unresponsive external APIs

**Acceptance Criteria:**
- Default timeout of 10 seconds (10000ms)
- Timeout configurable via config.timeout parameter
- AbortController used for precise timeout control
- ApiRequestError thrown on timeout with descriptive message
- Proper cleanup of AbortController resources

#### US004: Call An Http Endpoint ✅ [L]

**User Story:** As a API consumer, I want to call an HTTP endpoint to convert ASINs without importing the package so that I can convert ASINs from non-Node environments or as a quick integration

**Business Value:** I can convert ASINs from non-Node environments or as a quick integration

**Acceptance Criteria:**
- POST /product-identifiers/asins accepts { asins: string[] } body
- Supports 1-10 ASINs per request
- ASIN format validated: exactly 10 uppercase alphanumeric characters
- Response includes results array with per-item success/failure
- Response includes summary: total, successful, failed counts
- Middy middleware: httpJsonBodyParser, httpErrorHandler

#### US005: Receive Partial Results When ✅ [L]

**User Story:** As a API consumer, I want to receive partial results when some ASINs fail so that I get successful conversions even when some ASINs are not found

**Business Value:** I get successful conversions even when some ASINs are not found

**Acceptance Criteria:**
- ASINs processed in parallel via Promise.all()
- Each ASIN has independent error handling
- One ASIN failure does not block others
- Response returns 200 even with partial failures
- Each result includes success boolean and either identifiers or error details
- Summary counts reflect actual success/failure breakdown

#### US006: Configure Synccentric Api Credentials ✅ [M]

**User Story:** As a platform engineer, I want to configure Synccentric API credentials via environment variables so that I can manage secrets securely without hardcoding in source

**Business Value:** I can manage secrets securely without hardcoding in source

**Acceptance Criteria:**
- SYNCCENTRIC_HOST environment variable for API base URL
- SYNCCENTRIC_AUTH_KEY environment variable for Bearer token
- Variables sourced from AWS SSM Parameter Store in Lambda
- ConfigurationError thrown if variables missing at runtime
- Secure parameter used for auth key (encrypted in SSM)

#### US007: Verify Converter Handles All ✅ [L]

**User Story:** As a QA engineer, I want to verify converter handles all success and error scenarios so that I can ensure the package behaves correctly in production

**Business Value:** I can ensure the package behaves correctly in production

**Acceptance Criteria:**
- 42 tests across converter.test.ts, types.test.ts, errors.test.ts
- Tests cover successful conversion with all identifier types
- Tests cover input validation (empty array, invalid strings)
- Tests cover all 5 error classes with correct properties
- Tests cover timeout handling via mocked AbortError
- Tests use mocked fetch to avoid external API calls


## Progress

**Overall:** 100% (7/7 stories)

---

*Approver: TBD*
