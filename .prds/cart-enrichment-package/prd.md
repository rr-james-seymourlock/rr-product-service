# Cart Enrichment Package

## Introduction

A TypeScript package (@rr/cart-enricher) that enriches sparse cart data with rich product view data by matching cart items to previously viewed products. Takes a normalized cart and array of normalized product views (from the same store), matches items using SKU, URL, and extracted IDs, and outputs a unified dataset with combined product metadata for cart abandonment and member re-engagement campaigns.

**Last Updated:** 2025-12-11
**Version:** 1.0

## Problem Statement

Cart abandonment data is critical for re-engaging members, but cart events contain minimal product information (title, URL, price, quantity). Meanwhile, product view events captured from PDPs contain rich metadata (brand, category, description, rating, images, multiple identifiers). Since users typically view a product before adding to cart, we can correlate these events to enrich cart data. Currently there's no automated way to join cart items to their corresponding product views, leaving cart abandonment campaigns with sparse data that limits personalization and relevance.

### Market Opportunity
Cart abandonment emails are one of the highest-converting remarketing channels. Enriching cart data with product details enables: (1) Better product imagery and descriptions in abandonment emails, (2) Brand-level segmentation for targeted campaigns, (3) Category-based recommendations, (4) Price drop alerts using tracked pricing, (5) More accurate product matching for affiliate attribution. With millions of cart events daily and corresponding product views, joining this data unlocks significant value for member engagement.

### Target Users
- Marketing automation teams building cart abandonment campaigns
- Data engineers creating unified product-cart datasets for Snowflake
- ML engineers training models on shopping behavior (view → cart → purchase funnel)
- Analytics teams measuring view-to-cart conversion rates
- Backend services enriching real-time cart events for personalization

## Solution Overview

A package that accepts a normalized cart (from @rr/cart-event-normalizer) and array of normalized products (from @rr/product-event-normalizer) for the same store, then matches and merges the data. Matching uses a confidence-based approach: exact SKU match (highest), URL match, extracted ID overlap, or title similarity (lowest). Output is an array of EnrichedCartItem objects containing combined fields from both sources, plus metadata indicating data provenance (inCart, wasViewed, matchConfidence, matchMethod).

### Key Features
- enrichCart(cart: NormalizedCart, products: NormalizedProduct[]): EnrichedCart - Main entry point
- Multi-strategy matching: SKU exact match → variant SKU match → URL match → extractedIds overlap → fuzzy title match
- Confidence scoring: high (SKU), medium (URL/extractedIds), low (title similarity)
- Field merging with precedence: cart data (price, quantity) + product data (brand, category, description, rating, images)
- Variant-aware matching: uses product.variants[].sku and variants[].extractedIds for precise matching
- Provenance tracking: each item tagged with inCart, wasViewed, matchConfidence, matchMethod
- Unmatched handling: cart items without product matches still included with inCart=true, wasViewed=false
- Store validation: ensures cart and products are from same store before processing
- REST endpoint: POST /cart/enrich for HTTP integration

### Success Metrics
- 80%+ cart items successfully matched to product views (for users with view history)
- 95%+ precision on high-confidence matches (SKU-based)
- Sub-5ms enrichment time per cart item
- Zero data loss - all cart items preserved in output regardless of match
- 100% test coverage for matching logic
- Output schema compatible with existing cart abandonment systems

## User Stories

### Priority P0

#### US001: Enrich A Normalized Cart ⏳ [L]

**User Story:** As a data pipeline engineer, I want to enrich a normalized cart with product view data so that I can create rich cart abandonment datasets with full product metadata for marketing campaigns

**Business Value:** I can create rich cart abandonment datasets with full product metadata for marketing campaigns

**Acceptance Criteria:**
- enrichCart() accepts NormalizedCart and NormalizedProduct[] as inputs
- Returns EnrichedCart with array of EnrichedCartItem objects
- Cart items without matches are preserved with wasViewed=false
- Product views without cart matches are excluded from output
- All output arrays and objects are frozen (immutable)
- Validates that cart and products have matching storeId

#### US002: Match Cart Items To ⏳ [L]

**User Story:** As a data pipeline engineer, I want to match cart items to product views using multiple ID strategies so that I get the highest possible match rate across different data quality scenarios

**Business Value:** I get the highest possible match rate across different data quality scenarios

**Acceptance Criteria:**
- Match by exact SKU: cart.ids.skus intersects with product.ids.skus
- Match by variant SKU: cart.ids.skus intersects with product.variants[].sku
- Match by URL: normalized cart item URL matches product URL or variant URL
- Match by extractedIds: cart.ids.extractedIds intersects with product.ids.extractedIds or variant.extractedIds
- Match by title similarity: fuzzy match when other methods fail (configurable threshold)
- Matching stops at first successful strategy (highest confidence first)

#### US003: See Confidence Scores And ⏳ [L]

**User Story:** As a data pipeline engineer, I want to see confidence scores and match methods for each enriched item so that I can filter or weight results based on match quality for downstream processing

**Business Value:** I can filter or weight results based on match quality for downstream processing

**Acceptance Criteria:**
- Each EnrichedCartItem has matchConfidence: 'high' | 'medium' | 'low' | 'none'
- Each EnrichedCartItem has matchMethod: 'sku' | 'variant_sku' | 'url' | 'extracted_id' | 'title' | null
- SKU matches get 'high' confidence
- URL and extractedId matches get 'medium' confidence
- Title similarity matches get 'low' confidence
- Unmatched items get confidence 'none' and method null

### Priority P1

#### US004: Get Merged Product Data ⏳ [L]

**User Story:** As a data pipeline engineer, I want to get merged product data with clear field precedence so that I have a single enriched object with the best available data from both sources

**Business Value:** I have a single enriched object with the best available data from both sources

**Acceptance Criteria:**
- Cart-specific fields always from cart: quantity, cartPrice (original cart price)
- Product-specific fields from product when matched: brand, category, description, rating, variants
- Shared fields use cart value with product fallback: title, url, imageUrl
- Price field shows cart price (what user saw at cart time)
- All product identifiers merged: ids object combines both sources
- Matched variant data included when variant-level match occurs

#### US005: Track Data Provenance For ⏳ [M]

**User Story:** As a data pipeline engineer, I want to track data provenance for each enriched item so that I know which data came from cart vs product view for auditing and debugging

**Business Value:** I know which data came from cart vs product view for auditing and debugging

**Acceptance Criteria:**
- Each EnrichedCartItem has inCart: boolean (always true for cart enrichment)
- Each EnrichedCartItem has wasViewed: boolean (true if matched to product view)
- Each EnrichedCartItem has enrichedAt: ISO timestamp of enrichment
- Each EnrichedCartItem has sources object tracking which fields came from which source
- EnrichedCart has summary stats: totalItems, matchedItems, unmatchedItems, matchRate

#### US007: Configure A Minimum Confidence ⏳ [L]

**User Story:** As a data pipeline engineer, I want to configure a minimum confidence threshold for matches so that I can control the quality vs quantity tradeoff and only accept matches above a certain confidence level

**Business Value:** I can control the quality vs quantity tradeoff and only accept matches above a certain confidence level

**Acceptance Criteria:**
- enrichCart() accepts optional minConfidence: 'high' | 'medium' | 'low' parameter
- Items below threshold are marked as unmatched (wasViewed=false) even if a lower-confidence match exists
- Default threshold is 'low' (accept all matches)
- Threshold of 'high' only accepts SKU-based matches
- Threshold of 'medium' accepts SKU, URL, and extractedId matches
- Summary stats reflect matches above threshold only

### Priority P2

#### US006: Enrich Cart Data Via ⏳ [M]

**User Story:** As a API consumer, I want to enrich cart data via REST endpoint so that I can integrate cart enrichment into my application via HTTP without package dependency

**Business Value:** I can integrate cart enrichment into my application via HTTP without package dependency

**Acceptance Criteria:**
- POST /cart/enrich endpoint accepts { cart: NormalizedCart, products: NormalizedProduct[] }
- Response returns EnrichedCart with all enriched items and summary stats
- 400 response for validation errors (mismatched storeIds, invalid input)
- Response includes processing time in milliseconds
- Supports batch processing up to 50 products per request

### Priority P3

#### US008: Get A Numeric Confidence ⏳ [L]

**User Story:** As a data pipeline engineer, I want to get a numeric confidence score (0-100) based on multiple weighted signals so that I can make fine-grained decisions about match quality and tune thresholds based on observed precision/recall

**Business Value:** I can make fine-grained decisions about match quality and tune thresholds based on observed precision/recall

**Acceptance Criteria:**
- Each EnrichedCartItem has matchScore: number (0-100) in addition to categorical confidence
- Score is computed from weighted combination of signals: ID overlap, title similarity, price proximity, URL similarity
- Individual signal scores exposed: idScore, titleScore, priceScore, urlScore
- Weights are configurable via options parameter
- Default weights tuned for typical cart-product correlation patterns
- Score of 0 means no match signals, 100 means perfect match on all signals


## Progress

**Overall:** 0% (0/8 stories)

---

*Approver: TBD*
