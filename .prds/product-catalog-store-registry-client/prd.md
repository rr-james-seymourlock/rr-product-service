# Product Catalog Store Registry Client

## Introduction

A lightweight package that provides access to Rakuten's product catalog-enabled store IDs via the CBSP API. Supports fetching all enabled store IDs as a flat list and checking if a specific store ID is enabled for product catalog.

**Last Updated:** 2025-12-15
**Version:** 1.0

## Problem Statement

The product-id-extractor service needs to know which stores are enabled for product catalog functionality. Currently there's no programmatic way to check if a store ID should have product data extracted. This leads to unnecessary processing of URLs from stores that aren't part of the product catalog program.

### Market Opportunity
By filtering extraction to only product catalog-enabled stores (~803 stores), we can reduce unnecessary API calls, improve processing efficiency, and ensure data quality by only processing relevant store URLs.

### Target Users
- Product ID extraction service
- Store onboarding workflows
- Data validation pipelines
- Internal tooling and MCP servers

## Solution Overview

Create a new @rr/catalog-store-client package that wraps the CBSP store list API. The package will fetch and cache the list of product catalog-enabled store IDs, providing simple APIs to get all IDs or check membership. Built with caching to minimize API calls and support for both Node.js and edge runtimes.

### Key Features
- getAllStoreIds() - Returns a flat array of all product catalog-enabled store IDs
- isStoreEnabled(storeId) - Checks if a specific store ID is enabled for product catalog
- In-memory caching with configurable TTL to minimize API calls
- TypeScript-first with full type safety
- Zod schema validation for API responses
- Configurable API endpoint for different environments (prod/staging)

### Success Metrics
- 100% test coverage for core functionality
- API response cached with configurable TTL (default 5 minutes)
- Sub-millisecond lookup time for isStoreEnabled() after initial fetch
- Zero runtime dependencies beyond shared workspace packages

## User Stories


## Progress

**Overall:** 0% (0/0 stories)

---

*Approver: TBD*
