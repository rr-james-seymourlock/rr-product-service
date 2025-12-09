# Product Event Normalizer Package

## Introduction

A TypeScript package (@rr/product-event-normalizer) that processes raw product view events from Rakuten apps and browser extensions (PDP page visits), normalizes the structure, extracts and consolidates product identifiers from multiple sources (schema.org data, URL patterns, direct SKU/GTIN fields), and outputs a clean array of enriched product objects with comprehensive identifier coverage.

**Last Updated:** 2025-12-09
**Version:** 1.0

## Problem Statement

Our apps and browser extensions capture product view data when users visit product detail pages (PDPs) across thousands of merchant sites. This data is richer than cart data because it often includes schema.org structured data with SKUs, GTINs, MPNs, brands, and other product metadata extracted directly from the page. However, the raw event JSON has inconsistent field names between Toolbar and App sources (e.g., 'sku' vs 'sku_list', 'offers' vs 'offer_list'), arrays of varying lengths for multi-variant products, and product identifiers scattered across multiple fields (sku, gtin, productID, mpn, offers[].sku, urlToSku, priceToSku). We need a single package that consolidates all available identifiers, normalizes the structure, and outputs clean product arrays ready for analytics and catalog matching.

### Market Opportunity
Product view data is the richest source of product identifiers in our pipeline - often containing SKUs, GTINs, and MPNs that aren't available in cart data. With millions of PDP visits daily, normalizing this data enables: (1) Higher product match rates for catalog integration, (2) Brand-level analytics and reporting, (3) Price tracking and competitive intelligence, (4) Product recommendation improvements through better identification. The schema.org data extraction already exists - we just need to normalize and consolidate it effectively.

### Target Users
- Data engineers building Snowflake pipelines that consume product view events
- Analytics teams needing clean product data with brand and category information
- ML engineers training models on product browsing behavior
- Catalog matching systems that need comprehensive product identifiers (SKU, GTIN, MPN)
- Backend services performing real-time product analysis

## Solution Overview

A lightweight package that accepts raw product view event JSON and outputs an array of normalized ViewedProduct objects. The normalizer: (1) handles both Toolbar and App field naming conventions, (2) consolidates product identifiers from all available sources (sku, gtin, productID, mpn, offers, urlToSku, priceToSku, plus URL extraction), (3) maps fields to consistent camelCase schema, (4) handles multi-product pages (product listing pages that sometimes get captured), (5) correlates offers with their URLs and SKUs, (6) includes store context and rich metadata (brand, category, color, rating), and (7) returns a frozen array of ViewedProduct objects. The output schema extends CartProduct to maintain compatibility while adding PDP-specific fields.

### Key Features
- normalizeProductViewEvent(event: RawProductViewEvent): ViewedProduct[] - Main entry point
- Handles both Toolbar (sku, offers, gtin) and App (sku_list, offer_list, gtin_list) field naming
- Consolidates product IDs from: sku, gtin, productID, mpn, offers[].sku, urlToSku, priceToSku, and URL extraction
- Correlates multi-variant data: matches offers to URLs to SKUs using urlToSku/priceToSku mappings
- Output schema compatible with CartProduct: title, url, imageUrl, storeId, price, productIds
- Extended fields for PDP data: brand, category, color, rating, description, gtin, mpn, sku
- Handles multi-product pages: normalizes each product variant separately when offers array has multiple items
- Deduplicates product identifiers across all sources
- Zod schemas for input validation and TypeScript types
- Integrates @rr/product-id-extractor for URL-based ID extraction as fallback

### Success Metrics
- 100% of valid product view events produce normalized output without errors
- 95%+ product identifier extraction rate (at least one ID per product with available data)
- Sub-2ms normalization time per product view event
- Zero data loss - all available product identifiers preserved and deduplicated
- 100% test coverage for normalizer logic
- Output schema compatible with existing CartProduct consumers

## User Stories

### Priority P0

#### US001: Normalize Raw Product View ⏳ [M]

**User Story:** As a data pipeline engineer, I want to normalize raw product view events into a consistent CartProduct format so that I can process product views from both Toolbar and App sources with a unified schema

**Business Value:** I can process product views from both Toolbar and App sources with a unified schema

**Acceptance Criteria:**
- normalizeProductViewEvent() accepts RawProductViewEvent and returns readonly CartProduct[]
- Output schema matches CartProduct from @rr/cart-event-normalizer (title, url, imageUrl, storeId, price, productIds)
- store_id is coerced to string using coerceStoreId utility
- Empty/invalid events return empty frozen array
- All output arrays and objects are frozen (immutable)

#### US002: Have Product Ids Consolidated ⏳ [L]

**User Story:** As a data pipeline engineer, I want to have product IDs consolidated from multiple schema.org sources so that I get comprehensive product identification without needing to know the source field

**Business Value:** I get comprehensive product identification without needing to know the source field

**Acceptance Criteria:**
- Extract IDs from sku/sku_list arrays
- Extract IDs from gtin/gtin_list arrays
- Extract IDs from productID/productid_list arrays
- Extract IDs from mpn/mpn_list arrays
- Extract IDs from offers[].sku / offer_list[].offer_sku
- Deduplicate IDs across all sources
- Fallback to URL-based extraction via @rr/product-id-extractor when schema sources are empty

#### US003: Normalize Both Toolbar And ⏳ [M]

**User Story:** As a data pipeline engineer, I want to normalize both Toolbar and App field naming conventions so that I can process events from either source without special handling

**Business Value:** I can process events from either source without special handling

**Acceptance Criteria:**
- Handle Toolbar fields: sku, gtin, offers, productID, mpn, brand, image_url, urlToSku, priceToSku
- Handle App fields: sku_list, gtin_list, offer_list, productid_list, mpn_list, brand_list, image_url_list
- Handle App offer structure: offer_amount, offer_currency, offer_sku vs Toolbar: price, sku, url
- Support both string and number store_id values
- Support both naming conventions in the same codebase

### Priority P1

#### US004: Handle Multi-variant Products (single ⏳ [L]

**User Story:** As a data pipeline engineer, I want to handle multi-variant products (single page with multiple SKUs/prices) so that I can process product pages that show multiple variants like size/color options

**Business Value:** I can process product pages that show multiple variants like size/color options

**Acceptance Criteria:**
- Support products with multiple SKUs (e.g., Old Navy with 9 size variants)
- Support products with multiple prices in offers array
- Use urlToSku map to correlate URLs with specific SKUs
- Use priceToSku map to correlate prices with specific SKUs
- Return single CartProduct with all productIds consolidated when variants share same page
- Handle HP-style pages with multiple distinct products (return multiple CartProducts)

#### US006: Normalize Product View Events ⏳ [L]

**User Story:** As a API consumer, I want to normalize product view events via REST endpoint so that I can integrate product view normalization into my application via HTTP

**Business Value:** I can integrate product view normalization into my application via HTTP

**Acceptance Criteria:**
- POST /product-views/normalize endpoint accepts array of events
- Request body: { events: RawProductViewEvent[] } with 1-100 items
- Response includes results array with success/failure for each event
- Response includes summary: total, successful, failed, totalProducts
- 400 response for validation errors with detailed messages
- 500 response for internal errors

### Priority P2

#### US005: Extract Rich Metadata When ⏳ [L]

**User Story:** As a data pipeline engineer, I want to extract rich metadata when available so that I have additional product context for analytics and ML models

**Business Value:** I have additional product context for analytics and ML models

**Acceptance Criteria:**
- Extract brand from brand or brand_list field
- Extract rating from rating field (number)
- Extract description from description field
- Extract category from category or breadcrumbs fields
- Extract color from color or color_list fields
- All metadata fields are optional in output


## Progress

**Overall:** 0% (0/6 stories)

---

*Approver: TBD*
