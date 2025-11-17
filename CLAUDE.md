# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Rakuten microservice designed to extract product identifiers (IDs/SKUs) from product URLs across Rakuten's merchant network. The service handles URL parsing, normalization, and pattern-based ID extraction for approximately **4,000 Rakuten merchant stores**.

**Current Focus**: Perfecting the ID extraction logic and patterns. The service currently returns extracted IDs without persisting data.

**Future Architecture**:

- Event-driven integration with other Rakuten systems
- Data persistence to Snowflake for analytics and pattern improvement
- JSON-LD Product schema parsing (code exists in `src/parseProductSchema/` but not yet integrated)
- No authentication required at this stage

**Store IDs**: The store IDs in configs (e.g., `5246` for Target) are Rakuten merchant identifiers used throughout the Rakuten rewards/affiliate ecosystem.

## Commands

### Development

```bash
npm run offline           # Start Serverless Offline for local Lambda testing
npm test                  # Run all tests (Vitest)
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
npm run typecheck         # Type check without emitting files
npm run lint              # Check for linting issues
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier
```

### Running Single Test

```bash
npm test -- src/path/to/file.test.ts
```

### Deployment

```bash
npm run build             # Package service with Serverless Framework
npm run deploy            # Deploy to AWS (default stage)
npm run deploy -- --stage prod  # Deploy to production
```

## Architecture

### Core Processing Pipeline

This service extracts product identifiers from URLs through a multi-stage pipeline:

1. **URL Parsing** (`src/parseUrlComponents/`): Normalizes URLs and extracts components (domain, pathname, search params). Creates unique URL keys using SHA-1 hashing for future DynamoDB/Redis storage.

2. **Store Configuration** (`src/storeConfigs/`): Maps domains to store IDs and defines store-specific ID extraction patterns. Uses pre-compiled RegExp patterns indexed by store ID for performance. Supports domain aliases and ID transformation functions.

3. **ID Extraction** (`src/extractIdsFromUrlComponents/`): Extracts product IDs using store-specific patterns first, falling back to generic patterns. Includes timeout protection and result limits to prevent regex DoS.

4. **Product Schema Parsing** (`src/parseProductSchema/`): _[Future Implementation]_ Will parse JSON-LD Product schemas from HTML pages to extract SKUs, brand, and product metadata. Code is complete but not yet integrated into handlers.

### Key Architectural Patterns

**Middy Middleware Chain**: Lambda handlers use Middy middleware in this order:

1. `jsonBodyParser` - Parses JSON request body
2. `createZodValidator` - Validates against Zod schema (custom middleware in `src/middleware/zodValidator.ts`)
3. `httpErrorHandler` - Handles errors and formats responses

**Store Configuration System**: Three pre-compiled Maps for O(1) lookup performance:

- `STORE_ID_CONFIG`: Store ID → full config
- `STORE_NAME_CONFIG`: Domain → store ID
- `COMPILED_PATTERNS`: Store ID → RegExp patterns

The `getStoreConfig()` function uses a fast-path optimization for ID lookups.

**Path Alias**: Uses `@/` for imports, aliased to `./src` in:

- `tsconfig.json` (`paths` config)
- `vitest.config.ts` (`resolve.alias`)
- `serverless.yml` (`esbuild.alias`)

**ESM-Only Module**: Package uses `"type": "module"` with ES2020 target. Serverless esbuild outputs ESM format.

### Testing Strategy

Tests are co-located in `__tests__/` directories alongside source files. Vitest is configured to:

- Use `**/__tests__/**/*.test.ts` pattern
- Provide global test APIs (`describe`, `it`, `expect`)
- Support `@/` path alias via resolve config

## Important Implementation Notes

### Regex Safety

All regex patterns used for ID extraction must:

- Have the `global` flag enabled
- Include timeout protection (see `config.TIMEOUT_MS` in `extractIdsFromUrlComponents/config.ts`)
- Respect result limits (see `config.MAX_RESULTS`)
- Store-specific patterns are built using `ts-regex-builder` for safety

### Store Config Structure

When adding new stores to `src/storeConfigs/configs.ts`:

- Use `ts-regex-builder` for pattern construction to ensure regex safety
- Define `pathnamePatterns` for path-based IDs (e.g., `/product/{id}`)
- Define `searchPatterns` for query parameter IDs (e.g., `?productId={id}`)
- Add `transformId` function if IDs need normalization (e.g., removing prefixes)
- Use `aliases` for alternative domains/IDs that map to the same store

**Scale Considerations**: With 4,000 stores planned, the `configs.ts` file will become large but remain in-code for performance. The pre-compiled Maps (`STORE_ID_CONFIG`, `STORE_NAME_CONFIG`, `COMPILED_PATTERNS`) provide O(1) lookups critical for high-volume processing.

### Pattern Testing & Validation

Regex patterns must be thoroughly tested before deployment:

- Each store has a dedicated test suite in `__tests__/` directories
- CLI tooling exists for bulk testing patterns against real URL samples
- URLs with no matches will be logged to Snowflake for manual review and pattern refinement
- Use `csv-parse` dependency for processing bulk URL test datasets

### URL Normalization

URLs are normalized via `normalize-url` with custom rules in `src/parseUrlComponents/config.ts`:

- Strips tracking parameters
- Preserves certain subdomains (e.g., `m.`, `shop.`)
- Handles multi-part TLDs (e.g., `.co.uk`)

The `parseDomain()` function extracts base domain while preserving whitelisted subdomains.

## Technology Stack

- **Runtime**: Node.js 20.x on AWS Lambda
- **Framework**: Serverless Framework 3.x with esbuild bundling
- **Validation**: Zod schemas with custom Middy middleware
- **Testing**: Vitest with coverage reporting
- **Linting**: ESLint with TypeScript, import, regexp, sonarjs, and unicorn plugins
- **Commits**: Conventional commits enforced via commitlint and husky hooks
