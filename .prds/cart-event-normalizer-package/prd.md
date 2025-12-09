# Cart Event Normalizer Package

## Introduction

A TypeScript package (@rr/cart-event-normalizer) that processes raw cart event data from Rakuten apps and browser extensions, normalizes the structure, extracts product identifiers using @rr/product-id-extractor, and outputs a clean array of enriched product objects ready for analytics and downstream services.

**Last Updated:** 2025-12-08
**Version:** 1.0

## Problem Statement

Our apps and browser extensions capture shopping cart data from users across thousands of merchant sites and stream this data to Snowflake. The raw event JSON contains inconsistent field names, nested structures, and URLs that need product ID extraction. Each downstream consumer (analytics, matching, recommendations) would need to implement their own parsing and enrichment logic, leading to duplicated effort, inconsistent results, and maintenance burden. We need a single package that transforms raw cart events into a clean, consistent product array with extracted identifiers.

### Market Opportunity
Cart data flows through our entire analytics pipeline - from real-time dashboards to ML models for product recommendations. A standardized normalizer ensures consistent data quality across all consumers. With millions of cart events daily, even small improvements in extraction accuracy compound into significant data quality gains. This package also enables future enhancements like price tracking, inventory monitoring, and cross-merchant product matching.

### Target Users
- Data engineers building Snowflake pipelines that consume cart events
- Analytics teams needing clean product data for dashboards and reports
- ML engineers training models on shopping behavior data
- Backend services performing real-time cart analysis

## Solution Overview

A lightweight package that accepts raw cart event JSON and outputs an array of normalized CartProduct objects. The normalizer: (1) extracts the product_list array from the event, (2) maps each product to a clean schema with consistent field names, (3) uses @rr/product-id-extractor to extract product IDs from URLs, (4) includes store context (store_id) from the parent event, (5) filters out products missing required fields, and (6) returns a frozen array of CartProduct objects. The package handles edge cases like missing fields, malformed URLs, and empty carts gracefully.

### Key Features
- normalizeCartEvent(event: RawCartEvent): CartProduct[] - Main entry point
- Extracts product_list and maps to clean CartProduct schema
- Integrates @rr/product-id-extractor to extract product IDs from product URLs
- Consistent field naming: title, url, imageUrl, storeId, price, productIds
- Filters products missing required fields (url or title)
- Includes store_id from parent event on each product for context
- Zod schemas for input validation and output typing
- Handles edge cases: empty carts, missing fields, malformed URLs
- Frozen immutable output arrays for safety
- Zero external dependencies beyond @rr/product-id-extractor

### Success Metrics
- 100% of valid cart events produce normalized output without errors
- 95%+ product ID extraction rate for products with valid URLs
- Sub-1ms normalization time per cart event
- Zero data loss - all available product fields preserved
- 100% test coverage for normalizer logic
- Clean integration with existing Snowflake pipeline

## User Stories

### Priority P0

#### US001: Normalize Raw Cart Event ⏳ [M]

**User Story:** As a data engineer, I want to normalize raw cart event JSON into a clean product array so that I can ingest consistent, well-structured product data into Snowflake without writing custom parsing logic

**Business Value:** I can ingest consistent, well-structured product data into Snowflake without writing custom parsing logic

**Acceptance Criteria:**
- normalizeCartEvent(event) accepts RawCartEvent and returns CartProduct[]
- Output array contains only products with valid url or title
- Each CartProduct has: title, url, imageUrl, storeId, price, productIds fields
- Empty product_list returns empty array (not error)
- Invalid/malformed events throw descriptive errors

#### US002: Have Product Ids Automatically ⏳ [M]

**User Story:** As a data engineer, I want to have product IDs automatically extracted from product URLs so that I get enriched product data with identifiers ready for catalog matching without additional processing

**Business Value:** I get enriched product data with identifiers ready for catalog matching without additional processing

**Acceptance Criteria:**
- Each product's url is passed to @rr/product-id-extractor
- Extracted productIds array added to each CartProduct
- Products with no extractable IDs have empty productIds array
- Store ID from parent event used for store-specific pattern matching
- Extraction failures don't break normalization (graceful degradation)

#### US003: Have The Store_id From ⏳ [M]

**User Story:** As a data engineer, I want to have the store_id from the cart event included on each product so that I can filter and group products by store without joining back to the parent event

**Business Value:** I can filter and group products by store without joining back to the parent event

**Acceptance Criteria:**
- storeId field populated from parent event's store_id
- storeId is required on CartProduct output
- Works with numeric store_id values
- Handles missing store_id gracefully (use undefined or default)

#### US007: Handle Products Without Urls ⏳ [M]

**User Story:** As a data engineer, I want to handle products without URLs gracefully so that I don't lose product data when URLs are missing, and I can still track cart activity

**Business Value:** I don't lose product data when URLs are missing, and I can still track cart activity

**Acceptance Criteria:**
- Products without url field are still included in output
- productIds is empty array when no URL available
- Products with only name/title are valid
- Products with only price are valid (minimal product)
- Empty product objects are filtered out

#### US008: Handle Store_id As Both ⏳ [M]

**User Story:** As a data engineer, I want to handle store_id as both string and number types so that I can process events from both App (string IDs) and Toolbar (numeric IDs) sources without type errors

**Business Value:** I can process events from both App (string IDs) and Toolbar (numeric IDs) sources without type errors

**Acceptance Criteria:**
- Numeric store_id (e.g., 8333) parsed correctly
- String store_id (e.g., '8333') parsed correctly
- Output storeId is always number type
- Invalid store_id values handled gracefully

### Priority P1

#### US004: Have Consistent Field Naming ⏳ [L]

**User Story:** As a analytics engineer, I want to have consistent field naming across all normalized products so that I can build dashboards and queries without handling field name variations

**Business Value:** I can build dashboards and queries without handling field name variations

**Acceptance Criteria:**
- name -> title (consistent naming)
- url -> url (unchanged)
- image_url -> imageUrl (camelCase)
- item_price -> price (simplified)
- store_id -> storeId (camelCase)
- All output fields use camelCase convention

#### US005: Validate Input Events Against ⏳ [M]

**User Story:** As a data engineer, I want to validate input events against a Zod schema so that I get clear error messages when upstream data format changes unexpectedly

**Business Value:** I get clear error messages when upstream data format changes unexpectedly

**Acceptance Criteria:**
- RawCartEventSchema validates incoming event structure
- CartProductSchema defines output structure
- Validation errors include field path and expected type
- Optional: dev-mode validation, prod skips for performance
- Schemas exported for consumers to use

#### US006: Have Normalized Output Be ⏳ [M]

**User Story:** As a backend developer, I want to have normalized output be immutable so that I can safely cache and share results without defensive copying

**Business Value:** I can safely cache and share results without defensive copying

**Acceptance Criteria:**
- Output CartProduct[] array is Object.freeze()'d
- Individual CartProduct objects are frozen
- Nested arrays (productIds) are frozen
- TypeScript types use readonly modifiers

#### US009: Include Quantity And Line_total ⏳ [M]

**User Story:** As a data engineer, I want to include quantity and line_total in the normalized output so that I can calculate accurate cart analytics including total items and revenue

**Business Value:** I can calculate accurate cart analytics including total items and revenue

**Acceptance Criteria:**
- quantity field mapped to quantity in output
- line_total field mapped to lineTotal in output
- Both fields are optional (default to undefined if missing)
- quantity of 0 is valid (e.g., wishlists)


## Progress

**Overall:** 0% (0/9 stories)

---

*Approver: TBD*
