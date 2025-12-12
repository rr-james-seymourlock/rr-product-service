# Product ID Extraction Store Onboarding MCP Tool

## Introduction

An MCP server tool that guides developers through configuring product ID extraction from URLs for new stores. The tool analyzes product URLs to identify SKU/ID patterns, generates store-registry regex configurations, creates product-id-extractor test fixtures, validates extraction accuracy, and automates the git workflow. This enables anyone to easily add URL-based product ID extraction support for new merchant stores without understanding regex or the codebase structure.

**Last Updated:** 2025-12-12
**Version:** 1.0

## Problem Statement

Adding new stores to the product service requires deep knowledge of multiple parts of the codebase: understanding URL patterns, writing regex in ts-regex-builder format, creating JSON fixtures with correct structure, and following proper git workflows. This process is error-prone, time-consuming, and creates a high barrier to contribution. Developers must manually analyze URLs, guess at patterns, write complex regex, and ensure test coverage - all while maintaining consistency with existing code patterns.

### Market Opportunity
With approximately 4,000 Rakuten merchant stores to support, streamlining the store onboarding process is critical. Currently, adding a single store can take 30-60 minutes for experienced developers and much longer for newcomers. An MCP-guided workflow could reduce this to under 5 minutes while improving quality and consistency. This also enables non-engineers (product managers, analysts) to contribute store configurations by simply providing URLs.

### Target Users
- Engineers adding new store configurations to the product service
- QA engineers validating and expanding store coverage
- Product managers who want to quickly add support for new merchant partners
- External contributors unfamiliar with the codebase internals

## Solution Overview

Build MCP tools within packages/mcp-server that provide a guided, conversational workflow for store onboarding. The tools will: (1) Collect store metadata (ID, name, domain), (2) Accept and validate 5-50 example product URLs, (3) Filter out non-product URLs (category, cart, checkout pages), (4) Analyze URL patterns to identify extractable product IDs, (5) Present findings to user for confirmation, (6) Generate store-registry config with ts-regex-builder patterns, (7) Create product-id-extractor JSON fixtures, (8) Run extraction tests to validate patterns, (9) Create feature branch, commit changes, and open PR to main.

### Key Features
- Store existence check - detect if store already exists in registry with option to update/expand
- URL validation and filtering - identify and remove non-product URLs (category pages, cart, checkout, homepage)
- Pattern analysis engine - analyze URLs to identify product ID locations (path segments, query params) and formats
- Interactive confirmation - show user identified patterns and extracted IDs before generating code
- Store config generation - create ts-regex-builder patterns for store-registry/src/config.ts
- Fixture generation - create JSON test fixtures for product-id-extractor/src/__fixtures__/{store}.json
- Extraction validation - run tests to verify patterns correctly extract IDs from all provided URLs
- Git workflow automation - create named branch, commit with conventional message, open PR to main
- Update mode - add new URL patterns to existing stores without overwriting current configuration

### Success Metrics
- Time to add new store reduced from 30-60 minutes to under 5 minutes
- 100% of generated patterns pass extraction tests before commit
- Zero manual regex writing required by contributors
- All PRs follow consistent naming and commit message conventions
- Support adding 10+ stores per day with minimal engineering overhead

## User Stories

### Priority P0

#### US001: Initiate A New Store ⏳ [M]

**User Story:** As a developer, I want to initiate a new store onboarding workflow by providing store ID, name, and domain so that I can start the guided process without needing to know the codebase structure

**Business Value:** I can start the guided process without needing to know the codebase structure

**Acceptance Criteria:**
- Tool validates store ID is numeric and doesn't already exist in registry
- Tool validates domain format (e.g., example.com without protocol)
- Tool checks for existing store by both ID and domain with option to update
- Clear error messages if store already exists with link to update workflow
- Stores metadata in workflow state for subsequent steps

#### US002: Paste 5-50 Example Product ⏳ [L]

**User Story:** As a developer, I want to paste 5-50 example product URLs for the store so that I can provide real-world URLs without manual formatting or preprocessing

**Business Value:** I can provide real-world URLs without manual formatting or preprocessing

**Acceptance Criteria:**
- Accepts URLs in various formats (with/without protocol, trailing slashes)
- Validates minimum 5 URLs provided for pattern confidence
- Caps at 50 URLs to prevent analysis overhead
- Normalizes all URLs to consistent format
- Deduplicates URLs automatically
- Extracts domain and validates it matches provided store domain

#### US003: Have Non-product Urls Automatically ⏳ [L]

**User Story:** As a developer, I want to have non-product URLs automatically filtered out so that I don't need to manually clean my URL list and can paste raw data

**Business Value:** I don't need to manually clean my URL list and can paste raw data

**Acceptance Criteria:**
- Detects and removes category/collection URLs (e.g., /category/, /collections/)
- Detects and removes cart URLs (e.g., /cart, /basket, /checkout)
- Detects and removes account URLs (e.g., /account, /login, /register)
- Detects and removes homepage and landing pages
- Detects and removes search result pages
- Reports which URLs were filtered and why
- Warns if too many URLs filtered leaves fewer than 5 product URLs

#### US004: See Claude's Analysis Of ⏳ [L]

**User Story:** As a developer, I want to see Claude's analysis of URL patterns and identified product IDs so that I can verify the patterns are correct before code is generated

**Business Value:** I can verify the patterns are correct before code is generated

**Acceptance Criteria:**
- Displays each URL with highlighted ID segments
- Shows confidence level for each pattern (high/medium/low)
- Identifies ID location (pathname segment, query parameter)
- Shows ID format (numeric, alphanumeric, with prefix like 'prd-')
- Groups URLs by pattern type for clarity
- Flags URLs where no ID could be identified
- Allows user to confirm or reject analysis before proceeding

#### US005: Have Store-registry Config Code ⏳ [L]

**User Story:** As a developer, I want to have store-registry config code generated automatically so that I don't need to learn ts-regex-builder syntax or understand the config structure

**Business Value:** I don't need to learn ts-regex-builder syntax or understand the config structure

**Acceptance Criteria:**
- Generates valid TypeScript using ts-regex-builder patterns
- Includes helpful comments explaining the pattern
- Handles multiple patterns per store (pathname + search params)
- Uses lowercase patterns since URLs are normalized before matching
- Adds domain aliases if detected from URL variations
- Follows existing code style and formatting conventions
- Inserts config in alphabetical order by store ID

#### US006: Have Product-id-extractor Fixtures Generated ⏳ [L]

**User Story:** As a developer, I want to have product-id-extractor fixtures generated automatically so that I get comprehensive test coverage without writing JSON manually

**Business Value:** I get comprehensive test coverage without writing JSON manually

**Acceptance Criteria:**
- Creates JSON fixture file at correct path: src/__fixtures__/{store}.json
- Includes store name, ID, and domain metadata
- Creates test cases from validated URLs with expected SKUs
- Handles multiple expected IDs per URL when patterns extract multiple values
- All expected SKUs are lowercase (matching extraction normalization)
- Fixture passes JSON schema validation

#### US007: Validate That Extraction Tests ⏳ [L]

**User Story:** As a developer, I want to validate that extraction tests pass before committing so that I have confidence the patterns work correctly before opening a PR

**Business Value:** I have confidence the patterns work correctly before opening a PR

**Acceptance Criteria:**
- Runs product-id-extractor tests for the new fixture
- Reports pass/fail status for each URL test case
- On failure, shows which URLs failed and expected vs actual IDs
- Offers to retry with adjusted patterns on failure
- Blocks commit if tests fail
- Shows test execution time

#### US011: Have All Existing Store ⏳ [M]

**User Story:** As a developer, I want to have all existing store extraction tests run before committing new store config so that I can be confident that adding a new store doesn't break ID extraction for any existing stores

**Business Value:** I can be confident that adding a new store doesn't break ID extraction for any existing stores

**Acceptance Criteria:**
- Runs full product-id-extractor test suite (all fixtures) before allowing commit
- Reports any regressions in existing stores with clear diff of expected vs actual
- Blocks commit if any existing store tests fail
- Shows summary of all stores tested with pass/fail count
- Clearly distinguishes between new store test failures (fixable) vs regression failures (blocker)

#### US012: Have Existing Fixtures Detected ⏳ [L]

**User Story:** As a developer, I want to have existing fixtures detected and generic rules tested before generating store configs so that avoid creating unnecessary store-specific configurations when generic extraction rules already work, reducing code complexity and maintenance burden

**Business Value:** avoid creating unnecessary store-specific configurations when generic extraction rules already work, reducing code complexity and maintenance burden

**Acceptance Criteria:**
- Tool checks for existing fixture file by domain before analyzing URLs
- If fixture exists, runs tests to see if generic rules extract IDs correctly
- Reports whether generic rules pass or fail with clear explanation
- Only proceeds to generate store-specific config if generic rules fail
- Allows appending new test cases to existing fixtures without requiring store config
- Clear messaging distinguishes between 'fixture exists, tests pass' vs 'fixture exists, tests fail' vs 'no fixture exists'

### Priority P1

#### US008: Have A Feature Branch ⏳ [L]

**User Story:** As a developer, I want to have a feature branch created with conventional commit and PR opened so that I follow the team's git workflow without remembering branch naming conventions

**Business Value:** I follow the team's git workflow without remembering branch naming conventions

**Acceptance Criteria:**
- Creates branch named feat/store-{storename}-config
- Stages only relevant files (config.ts, fixture JSON)
- Creates commit with message: feat(store-registry): add {StoreName} ({storeId}) store configuration
- Pushes branch to origin
- Opens PR to main with structured description
- PR description includes list of URL patterns and test results
- Reports PR URL to user upon completion

#### US009: Update An Existing Store ⏳ [L]

**User Story:** As a developer, I want to update an existing store with additional URL patterns so that I can expand coverage without duplicating or overwriting existing patterns

**Business Value:** I can expand coverage without duplicating or overwriting existing patterns

**Acceptance Criteria:**
- Detects when store already exists and offers update mode
- Loads existing patterns to avoid duplication
- Analyzes new URLs and identifies novel patterns not already configured
- Merges new patterns with existing config
- Appends new test cases to existing fixture file
- Preserves existing test cases and patterns
- Creates PR with 'update' prefix: feat(store-registry): update {StoreName} patterns

#### US010: Receive Clear Guidance And ⏳ [L]

**User Story:** As a developer, I want to receive clear guidance and error recovery throughout the workflow so that I can complete the process even when things go wrong

**Business Value:** I can complete the process even when things go wrong

**Acceptance Criteria:**
- Each step has clear instructions on what input is expected
- Validation errors explain what's wrong and how to fix
- Can go back to previous steps to correct mistakes
- Graceful handling of git conflicts with resolution guidance
- Timeout handling for long-running operations
- Can abort workflow cleanly at any point without leaving partial state


## Progress

**Overall:** 0% (0/12 stories)

---

*Approver: TBD*
