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
npm run test:bench        # Run performance benchmarks
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

## Developer Experience

### Recommended VSCode Extensions

This project includes VSCode workspace settings optimized for TypeScript development. Install recommended extensions:

**Core Tooling:**

- ESLint (`dbaeumer.vscode-eslint`) - Linting with auto-fix on save
- Prettier (`esbenp.prettier-vscode`) - Code formatting
- EditorConfig (`EditorConfig.EditorConfig`) - Consistent editor settings

**TypeScript Enhancements:**

- Pretty TypeScript Errors (`yoavbls.pretty-ts-errors`) - Readable error messages
- Error Lens (`usernamehw.errorlens`) - Inline error/warning display

**Testing:**

- Vitest Explorer (`vitest.explorer`) - Test runner UI with inline results

**Code Quality:**

- Code Spell Checker (`streetsidesoftware.code-spell-checker`) - Spell checking

**Git:**

- GitLens (`eamodio.gitlens`) - Enhanced Git integration

### IDE Features

The workspace is configured for optimal DX:

- **Format on save**: Prettier auto-formats all files
- **ESLint auto-fix**: Lint errors fixed on save
- **Import path**: Non-relative imports using `@/` alias
- **TypeScript**: Workspace version with modern import updates
- **Vitest integration**: Run tests directly from editor
- **.editorconfig**: Cross-editor consistency (indent, line endings, etc.)

## Configuration Files

All configuration files use **modern formats** with type safety:

- **`prettier.config.mjs`**: Code formatting rules (Prettier)
  - Uses `.mjs` (ESM) with JSDoc type annotations
- **`eslint.config.mts`**: Linting rules (ESLint v9 flat config)
  - Uses `.mts` extension for TypeScript ESM support
  - Configured with `projectService: true` for modern TypeScript integration
- **`commitlint.config.ts`**: Commit message linting (Conventional Commits)
- **`lint-staged.config.mjs`**: Pre-commit hook configuration
  - Uses `.mjs` (ESM) with JSDoc type annotations
- **`vitest.config.ts`**: Test framework configuration
- **`tsconfig.json`**: TypeScript compiler options

All config files use typed exports (TypeScript or JSDoc) for IDE autocomplete and compile-time validation.

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

**CI-Aware Tests**: For performance or timing-sensitive tests, use `process.env['CI']` to detect GitHub Actions and apply relaxed thresholds. GitHub Actions automatically sets `CI=true`. Example:

```typescript
const threshold = process.env['CI'] ? 10 : 3; // Relaxed threshold on CI
expect(ratio).toBeLessThan(threshold);
```

This prevents flaky tests on shared CI runners while maintaining stricter validation locally.

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

- **Runtime**: Node.js 22.x on AWS Lambda
- **Framework**: AWS SAM with esbuild bundling
- **Validation**: Zod schemas with custom Middy middleware
- **Testing**: Vitest with coverage reporting
- **Linting**: ESLint with TypeScript, import, regexp, sonarjs, and unicorn plugins
- **Commits**: Conventional commits enforced via commitlint and husky hooks
- run typecheck, lint and build after every major change to make sure everything works

## Using QMD for Codebase Search

This project uses [qmd](https://github.com/tobi/qmd) - a local semantic search engine for markdown documents. Use qmd when you need to find relevant documentation, understand patterns, or locate implementation details.

### When to Use QMD

Use qmd for:
- **Finding documentation**: "How does URL normalization work?"
- **Understanding patterns**: "What store configuration patterns exist?"
- **Locating implementation details**: "Where is product ID extraction defined?"
- **Discovering related files**: "What packages handle cart events?"

### QMD Commands (via Bash)

```bash
# Fast keyword search (BM25) - best for specific terms
qmd search "store configuration" -n 5

# Semantic search - best for concepts/questions
qmd vsearch "how to add a new store" -n 5

# Hybrid search with LLM re-ranking - best quality results
qmd query "URL parsing and normalization" -n 5

# Get specific file content
qmd get packages/url-parser/README.md

# List all indexed files
qmd ls provo

# Search within specific collection
qmd search "regex patterns" -c provo
```

### Search Output Options

```bash
# JSON output for programmatic use
qmd search "validation" --json -n 10

# Full document content instead of snippets
qmd search "API endpoints" --full

# Files only (paths without content)
qmd search "testing" --files

# Markdown formatted output
qmd query "error handling" --md
```

### Best Practices for AI Agents

1. **Start with `qmd search`** for exact terms or keywords you know exist
2. **Use `qmd vsearch`** when searching for concepts or asking questions
3. **Use `qmd query`** for complex queries where you need the best results
4. **Limit results** with `-n` flag to avoid overwhelming context
5. **Use `--files`** when you just need file paths, not content
6. **Chain with `qmd get`** to retrieve full file content after finding relevant docs

### Keeping Index Updated

```bash
# Re-index after adding new documentation
qmd update

# Re-index and pull git changes first
qmd update --pull

# Regenerate embeddings (after update)
qmd embed
```

### QMD Collection Details

The `provo` collection indexes all markdown files in this repository:
- Pattern: `**/*.md`
- Excludes: `node_modules/`, `.git/`, `dist/`, `build/`
- Context: "Rakuten Product Service - microservice for extracting product IDs from e-commerce URLs across 4000+ merchant stores"