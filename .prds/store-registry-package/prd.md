# Store Registry Package

## Introduction

A high-performance TypeScript package (@rr/store-registry) that manages merchant store configurations for Rakuten's product services. Provides O(1) constant-time lookups via pre-compiled Maps, supporting store identification by domain or internal ID. Designed for Lambda cold start optimization and horizontal scaling to 4,000+ merchants with sub-millisecond lookup times.

**Last Updated:** 2025-12-08
**Version:** 1.0

## Problem Statement

Rakuten's product services need to identify merchants from URLs and apply store-specific processing rules. With 4,000+ merchants in the network, each with unique domains, aliases, URL patterns, and ID formats, we need a centralized registry that: (1) provides instant O(1) lookups regardless of store count, (2) supports multiple domains/aliases per merchant, (3) pre-compiles regex patterns to avoid runtime overhead, (4) maintains immutability for Lambda warm container safety, and (5) minimizes cold start impact. Without this, each service would implement its own store matching logic, causing inconsistencies and performance issues at scale.

### Market Opportunity
The store registry is foundational infrastructure for all Rakuten product services. It enables product ID extraction, catalog matching, affiliate tracking, and merchant analytics. Current deployment supports 81 stores with architecture validated for 2,000+ stores. Performance characteristics (0.29ms cold start, <5μs lookups, ~45KB memory) ensure the registry adds negligible overhead while enabling consistent merchant identification across all services.

### Target Users
- Product ID extraction service requiring store-specific patterns
- Catalog matching services identifying merchants from URLs
- Analytics pipelines needing merchant metadata
- Integration engineers onboarding new merchants
- Future services requiring merchant-specific configuration

## Solution Overview

A standalone package exporting four pre-compiled ReadonlyMaps built at module load: STORE_ID_CONFIG (ID→config), STORE_DOMAIN_CONFIG (domain→config), STORE_NAME_CONFIG (domain→ID, deprecated), and COMPILED_PATTERNS (ID→RegExp[]). The getStoreConfig() function provides unified lookup by domain or ID. All configurations are deep-frozen for immutability. Store configs support: primary domain, ID aliases, domain aliases, pathname patterns, search patterns, ID transformation functions, and pattern format documentation. Cold start optimizations include pre-allocated arrays and imperative loops eliminating intermediate allocations.

### Key Features
- O(1) constant-time lookups via pre-compiled Maps (~5μs per lookup)
- Four lookup Maps: STORE_ID_CONFIG, STORE_DOMAIN_CONFIG, STORE_NAME_CONFIG, COMPILED_PATTERNS
- 81 stores currently configured with architecture supporting 4,000+
- Domain and ID alias system for multi-brand merchants (e.g., Gap Inc. with 5 aliases)
- Pre-compiled RegExp patterns via ts-regex-builder preventing runtime compilation
- Optional transformId functions for store-specific ID normalization
- Deep-frozen immutable configs safe for Lambda warm containers
- Cold start optimization: 0.29ms initialization, projected 5-8ms at 2,000 stores
- Memory efficient: ~45KB for 81 stores, projected ~1.1MB for 2,000 stores
- Structured JSON logging with namespace support

### Success Metrics
- O(1) lookup performance independent of store count
- Cold start initialization <10ms for 2,000+ stores
- Memory footprint <2MB for 4,000 stores
- 100% test coverage for registry logic
- Zero runtime regex compilation (all pre-compiled)
- Support 1,000+ RPS with <1ms total lookup overhead
- New store onboarding in <15 minutes

## User Stories

### Priority P0

#### US001: Look Up A Store ✅ [M]

**User Story:** As a service developer, I want to look up a store configuration by domain name so that I can identify which merchant a URL belongs to and retrieve their specific settings

**Business Value:** I can identify which merchant a URL belongs to and retrieve their specific settings

**Acceptance Criteria:**
- getStoreConfig({ domain: 'target.com' }) returns full StoreConfigInterface
- STORE_DOMAIN_CONFIG provides direct domain-to-config O(1) lookup
- Lookup returns undefined for unknown domains (no errors thrown)
- Domain aliases resolve to parent store configuration
- Lookup performance is <5μs regardless of registry size

#### US002: Look Up A Store ✅ [M]

**User Story:** As a service developer, I want to look up a store configuration by internal store ID so that I can retrieve merchant settings when I already know the Rakuten store ID

**Business Value:** I can retrieve merchant settings when I already know the Rakuten store ID

**Acceptance Criteria:**
- getStoreConfig({ id: '5246' }) returns full StoreConfigInterface
- STORE_ID_CONFIG provides direct ID-to-config O(1) lookup
- Lookup returns undefined for unknown IDs (no errors thrown)
- ID aliases resolve to parent store configuration
- ID lookup takes precedence when both domain and ID provided

#### US003: Access Pre-compiled Regex Patterns ✅ [M]

**User Story:** As a service developer, I want to access pre-compiled regex patterns for a store so that I can extract product IDs without runtime regex compilation overhead

**Business Value:** I can extract product IDs without runtime regex compilation overhead

**Acceptance Criteria:**
- COMPILED_PATTERNS Map provides ID-to-RegExp[] lookup
- Only stores with pathnamePatterns are included (74 of 81 stores)
- Patterns are ReadonlyArray<RegExp> preventing mutation
- All patterns have global flag enabled for proper matching
- Patterns built with ts-regex-builder for ReDoS safety

#### US004: Add A New Store ✅ [M]

**User Story:** As a integration engineer, I want to add a new store configuration with custom patterns so that I can onboard new merchants to the Rakuten network

**Business Value:** I can onboard new merchants to the Rakuten network

**Acceptance Criteria:**
- StoreConfigInterface defines: id, domain, aliases?, patternFormats?, pathnamePatterns?, searchPatterns?, transformId?
- Config added to mutableStoreConfigs array in config.ts
- Patterns built with ts-regex-builder for safety
- Config automatically deep-frozen at module load
- New store appears in all four lookup Maps after rebuild

#### US005: Configure Domain And Id ✅ [M]

**User Story:** As a integration engineer, I want to configure domain and ID aliases for multi-brand merchants so that I can map multiple domains and IDs to a single parent store configuration

**Business Value:** I can map multiple domains and IDs to a single parent store configuration

**Acceptance Criteria:**
- aliases field accepts ReadonlyArray<StoreAlias> with {id, domain} pairs
- Alias domains appear in STORE_DOMAIN_CONFIG pointing to parent config
- Alias IDs appear in STORE_ID_CONFIG pointing to parent config
- Memory efficient: aliases share reference to parent config object
- Example: Gap Inc. has 5 aliases (gapfactory, oldnavy, bananarepublic, etc.)

#### US007: Have The Registry Initialize ✅ [L]

**User Story:** As a platform engineer, I want to have the registry initialize with minimal cold start impact so that Lambda functions start quickly even with thousands of store configurations

**Business Value:** Lambda functions start quickly even with thousands of store configurations

**Acceptance Criteria:**
- All four Maps built at module load (one-time cost)
- Pre-allocated arrays with exact sizes eliminate resizing
- Imperative loops avoid intermediate array allocations
- Current cold start: 0.29ms for 81 stores
- Projected cold start: 5-8ms for 2,000 stores
- Build timing logged for observability

#### US008: Have All Configurations Deeply ✅ [M]

**User Story:** As a platform engineer, I want to have all configurations deeply frozen for immutability so that Lambda warm containers cannot accidentally mutate shared state

**Business Value:** Lambda warm containers cannot accidentally mutate shared state

**Acceptance Criteria:**
- All StoreConfigInterface objects are Object.freeze()'d
- Nested arrays (aliases, patterns, patternFormats) are frozen
- Nested objects (each alias) are frozen
- TypeScript readonly modifiers enforce at compile time
- Final storeConfigs export is frozen array of frozen objects

#### US010: Verify Registry Performance And ✅ [M]

**User Story:** As a QA engineer, I want to verify registry performance and correctness so that I can ensure the registry meets performance requirements at scale

**Business Value:** I can ensure the registry meets performance requirements at scale

**Acceptance Criteria:**
- 31 tests covering all lookup mechanisms and edge cases
- Performance tests verify <0.01ms average lookup time
- 1000 RPS simulation completes in <50ms
- 100% code coverage for registry logic
- Tests verify O(1) performance independent of store position

### Priority P1

#### US006: Define An Id Transformation ✅ [M]

**User Story:** As a integration engineer, I want to define an ID transformation function for stores with non-standard formats so that I can normalize extracted IDs to match our catalog format

**Business Value:** I can normalize extracted IDs to match our catalog format

**Acceptance Criteria:**
- transformId field accepts (id: string) => string function
- Function called after pattern extraction, before result return
- Examples: remove prefixes (p- → sku-), remove characters, change separators
- Current stores using: love-scent.com, ikea.com, magneticme.com
- Function is optional - omit for stores needing no transformation

#### US009: Iterate Over All Store ✅ [M]

**User Story:** As a service developer, I want to iterate over all store configurations so that I can perform bulk operations like validation or reporting across all merchants

**Business Value:** I can perform bulk operations like validation or reporting across all merchants

**Acceptance Criteria:**
- storeConfigs export provides ReadonlyArray<StoreConfigInterface>
- Array contains 81 frozen store configuration objects
- Iteration does not affect lookup Map performance
- Can filter/map without mutating original array
- Useful for admin tooling, reports, and bulk validation


## Progress

**Overall:** 100% (10/10 stories)

---

*Approver: TBD*
