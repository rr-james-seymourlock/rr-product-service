# RR Product Service

A high-performance monorepo microservice for extracting product identifiers from e-commerce URLs across Rakuten's 4,000+ merchant network. Built with TypeScript, AWS Lambda (SAM), and modern tooling.

## Overview

The RR Product Service analyzes product URLs and extracts unique identifiers (SKUs, product IDs) using intelligent pattern matching and store-specific configuration. It provides REST API endpoints for single and batch URL processing, returning normalized product identifiers for use across Rakuten's affiliate ecosystem.

**Key Features:**

- 🚀 **High Performance** - Optimized for 1000+ RPS on AWS Lambda
- 📦 **Monorepo Architecture** - Modular packages with shared utilities
- 🔍 **Smart Extraction** - Store-specific patterns + generic fallbacks for 4,000+ stores
- 🛡️ **Type-Safe** - Full TypeScript with Zod runtime validation
- 📊 **Batch Processing** - Analyze 1-100 URLs in parallel
- 📚 **OpenAPI Docs** - Interactive API documentation with Redoc
- ✅ **Comprehensive Testing** - 585+ tests with 97%+ coverage

## Architecture

### Monorepo Structure

```
rr-product-service/
├── apps/
│   └── product-service/        # Lambda service (SAM/Serverless)
│       ├── src/functions/      # Lambda handlers
│       ├── template.yaml       # SAM template
│       └── docs/openapi.json   # Generated API spec
├── packages/
│   ├── url-parser/             # URL normalization & parsing
│   ├── product-id-extractor/   # ID extraction logic
│   ├── store-registry/         # Store configuration management
│   ├── schema-parser/          # JSON-LD schema parsing (future)
│   └── shared/                 # Shared utilities (logger, types)
└── package.json                # Workspace root
```

### Processing Pipeline

```
1. URL Input
   ↓
2. parseUrlComponents (@rr/url-parser)
   - Normalize URL (remove tracking params, force HTTPS)
   - Extract domain, pathname, query params
   - Generate unique cache key
   ↓
3. getStoreConfig (@rr/store-registry)
   - Lookup store by domain (O(1))
   - Retrieve store-specific patterns
   ↓
4. extractIdsFromUrlComponents (@rr/product-id-extractor)
   - Apply store-specific pathname patterns
   - Fallback to generic patterns
   - Apply query parameter patterns
   - Deduplicate and normalize results
   ↓
5. Return product IDs
```

## Tech Stack

### Core Technologies

- **Runtime:** Node.js 22.x (ESM modules)
- **Language:** TypeScript 5.x with strict mode
- **Package Manager:** pnpm 9.x with workspaces
- **Build System:** Turborepo for caching & parallel builds
- **Bundler:** esbuild (via SAM/Serverless)
- **Deployment:** AWS SAM (Serverless Application Model)

### Application Framework

- **Lambda Framework:** AWS SAM
- **Middleware:** Middy.js for request/response handling
- **Validation:** Zod schemas with TypeScript inference
- **Logging:** Pino (production-grade structured logging)
- **API Docs:** OpenAPI 3.1 with Redoc UI

### Development Tools

- **Testing:** Vitest with coverage reporting
- **Linting:** ESLint 9.x (flat config) with TypeScript, SonarJS, Unicorn plugins
- **Formatting:** Prettier with import sorting
- **Git Hooks:** Husky + lint-staged + commitlint
- **Type Checking:** TypeScript project references

## Prerequisites

- **Node.js** 22.21.0+ (use `nvm use` or `nvm install` - `.nvmrc` provided)
- **pnpm** 9.x (`npm install -g pnpm@latest`)
- **AWS SAM CLI** (for local Lambda testing): [Install Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- **AWS CLI** configured with credentials (for deployment)
- **OAK** (Rakuten AWS auth - for deployment to Rakuten AWS)

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd rr-product-service

# Install dependencies (uses pnpm workspaces)
pnpm install
```

### Development Workflow

```bash
# Build all packages (cached with Turborepo)
pnpm build

# Run all tests across packages
pnpm test

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Format all code
pnpm format
```

## Running Locally

### Option 1: Local Dev Server (Recommended for Development)

Fast, lightweight HTTP server using Node.js built-in http module:

```bash
# Start local server (no Docker required)
cd apps/product-service
pnpm dev:local

# Server starts on http://localhost:3000
```

**Test endpoints:**

```bash
# Health check
curl http://localhost:3000/health

# Analyze single URL
curl -X POST http://localhost:3000/url-analysis \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.nike.com/t/air-max-90/CN8490-100"}'

# Batch analyze URLs
curl -X POST http://localhost:3000/url-analysis/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      {"url": "https://www.target.com/p/product/-/A-12345678"},
      {"url": "https://www.nike.com/t/air-max/CN8490-100"}
    ]
  }'
```

### Option 2: SAM Local (Emulates API Gateway + Lambda)

More accurate Lambda simulation with API Gateway integration:

```bash
cd apps/product-service

# Start SAM local API
sam local start-api

# API starts on http://localhost:3000
```

Test with the same curl commands as above.

## API Documentation

### Viewing OpenAPI Documentation

Interactive API documentation with Redoc:

```bash
# Generate OpenAPI spec from Zod schemas
cd apps/product-service
pnpm docs:generate

# Serve documentation at http://localhost:8080
pnpm docs:serve
```

Open http://localhost:8080 in your browser to view:

- Complete API specification
- Request/response schemas
- Interactive examples
- Error responses

### API Endpoints

#### `GET /health`

Health check endpoint for monitoring and load balancer probes.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-26T12:34:56.789Z"
}
```

#### `POST /url-analysis`

Analyze a single product URL and extract product identifiers.

**Request:**

```json
{
  "url": "https://www.nike.com/t/air-max-270/AH8050-001",
  "storeId": "nike.com" // optional
}
```

**Response:**

```json
{
  "url": "https://nike.com/t/air-max-270/ah8050-001",
  "productIds": ["ah8050-001"],
  "count": 1
}
```

#### `POST /url-analysis/batch`

Analyze multiple URLs in parallel (1-100 URLs per request).

**Request:**

```json
{
  "urls": [
    { "url": "https://www.target.com/p/product/-/A-12345678" },
    { "url": "https://www.nike.com/t/air-max/CN8490-100", "storeId": "nike.com" }
  ]
}
```

**Response:**

```json
{
  "results": [
    {
      "url": "https://target.com/p/product/-/a-12345678",
      "productIds": ["12345678"],
      "count": 1,
      "success": true
    },
    {
      "url": "https://nike.com/t/air-max/cn8490-100",
      "productIds": ["cn8490-100"],
      "count": 1,
      "success": true
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0
}
```

## Testing

### Running Tests

```bash
# Run all tests (all packages)
pnpm test

# Run tests for specific package
pnpm --filter @rr/url-parser test
pnpm --filter @rr/product-id-extractor test
pnpm --filter @rr/store-registry test

# Run tests in watch mode
pnpm --filter @rr/url-parser test:watch

# Run with coverage
pnpm test:coverage

# Run performance benchmarks
pnpm --filter @rr/product-id-extractor test:bench
```

### Test Suites

**Package-Level Tests:**

- `@rr/url-parser` - 150 tests (normalization, domain parsing, key generation)
- `@rr/product-id-extractor` - 585 tests (pattern matching, store configs, regex security)
- `@rr/store-registry` - 31 tests (lookups, aliases, performance)
- `@rr/schema-parser` - 15+ tests (JSON-LD parsing, SKU extraction)

**Integration Tests:**

- `apps/product-service` - Handler tests for all endpoints

**Total Coverage:**

- 97.91% line coverage
- 97.36% branch coverage
- 780+ total tests

### Testing Single Files

```bash
# Test specific file
pnpm test -- packages/url-parser/src/__tests__/parser.test.ts

# Test with specific pattern
pnpm test -- -t "should extract domain"
```

## Building & Deployment

### Building

```bash
# Build all packages (uses Turborepo cache)
pnpm build

# Build specific package
pnpm --filter @rr/product-service build

# Clean all build artifacts
pnpm clean
```

Build output:

- `apps/product-service/dist/` - Lambda handlers (ESM bundles)
- Each package compiles TypeScript for type checking

### Deployment with SAM

```bash
cd apps/product-service

# Build and package
sam build

# Deploy to AWS (guided)
sam deploy --guided

# Deploy to specific stack
sam deploy --stack-name rr-product-service-dev

# View deployed resources
sam list endpoints --stack-name rr-product-service-dev
```

**SAM Template:** `apps/product-service/template.yaml`

**Deployed Resources:**

- 3 Lambda functions (health, create-url-analysis, create-batch-url-analysis)
- API Gateway REST API
- IAM roles
- CloudWatch log groups

## Coding Methodology

### Architecture Principles

1. **Modular Design** - Packages are independent, single-purpose, and composable
2. **Type Safety** - TypeScript strict mode with Zod runtime validation
3. **Performance First** - Optimized for AWS Lambda cold starts and high RPS
4. **Immutability** - ReadonlyArrays, ReadonlyMaps, Object.freeze
5. **Error Handling** - Custom error classes with rich context
6. **Logging** - Structured JSON logs with Pino (production-grade)

### Code Organization

**Packages follow a standard structure:**

```
packages/example/
├── src/
│   ├── __tests__/          # Co-located tests
│   ├── index.ts            # Public API exports
│   ├── *.ts                # Implementation files
│   ├── config.ts           # Configuration
│   ├── logger.ts           # Package-specific logger
│   └── errors.ts           # Custom error classes
├── README.md               # Package documentation
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Development Practices

- **ESM Only** - All packages use `"type": "module"`
- **Path Aliases** - Use `@rr/*` for internal packages
- **Conventional Commits** - Enforced with commitlint
- **Pre-commit Hooks** - Lint, format, type check before commit
- **Git Workflow** - Feature branches, PR reviews, conventional commits

### Configuration Files (Modern Formats)

- `eslint.config.mts` - ESLint 9 flat config with TypeScript
- `prettier.config.mjs` - ESM with JSDoc types
- `vitest.config.ts` - TypeScript configuration
- `commitlint.config.ts` - TypeScript configuration
- `lint-staged.config.mjs` - ESM with JSDoc types

## Package Documentation

Each package has comprehensive documentation:

- **[@rr/url-parser](packages/url-parser/README.md)** - URL normalization and parsing
- **[@rr/product-id-extractor](packages/product-id-extractor/README.md)** - ID extraction logic
- **[@rr/store-registry](packages/store-registry/README.md)** - Store configuration management
- **[@rr/schema-parser](packages/schema-parser/README.md)** - JSON-LD schema parsing
- **[@rr/shared](packages/shared/README.md)** - Shared utilities and logger

See individual package READMEs for detailed API references and usage examples.

## Available Commands

### Root-Level Commands (Turborepo)

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm install`     | Install all dependencies                     |
| `pnpm build`       | Build all packages (cached)                  |
| `pnpm test`        | Run all tests                                |
| `pnpm typecheck`   | Type check all packages                      |
| `pnpm lint`        | Lint all packages                            |
| `pnpm format`      | Format all code with Prettier                |
| `pnpm clean`       | Clean all build artifacts and node_modules   |

### Product Service Commands

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `pnpm dev:local`     | Start local dev server (port 3000)         |
| `pnpm docs:generate` | Generate OpenAPI spec from Zod schemas     |
| `pnpm docs:serve`    | Serve API documentation (port 8080)        |
| `pnpm build`         | Build Lambda functions with esbuild        |

### Package-Specific Commands

```bash
# Run command in specific package
pnpm --filter @rr/url-parser test
pnpm --filter @rr/product-id-extractor test:bench
pnpm --filter @rr/store-registry typecheck
```

## Environment Variables

### Development

- `NODE_ENV=development` - Enables pretty logs, dev features
- `LOG_LEVEL=debug` - Set log level (debug, info, warn, error)

### Production (Lambda)

- `NODE_ENV=production` - Production mode
- `LOG_LEVEL=info` - Default log level
- `AWS_LAMBDA_FUNCTION_NAME` - Auto-set by Lambda

### Testing

- `NODE_ENV=test` - Suppresses logs, uses simple console output

## Troubleshooting

### Common Issues

**"Module not found" errors:**

```bash
# Rebuild all packages
pnpm build
```

**TypeScript errors in IDE:**

```bash
# Restart TypeScript server in VSCode
# Cmd+Shift+P -> "TypeScript: Restart TS Server"

# Or rebuild
pnpm typecheck
```

**Tests failing:**

```bash
# Clear Vitest cache
pnpm test -- --no-cache

# Run specific test file
pnpm test -- path/to/test.ts
```

**SAM local not working:**

```bash
# Rebuild SAM
cd apps/product-service
sam build

# Check SAM version
sam --version  # Should be 1.100.0+
```

## Performance

### Benchmarks

- **Cold start:** < 100ms (with esbuild bundling)
- **Warm request:** < 10ms per URL
- **Batch processing:** 1-100 URLs in < 200ms
- **Store lookups:** < 0.01ms (O(1) Map access)
- **Regex execution:** < 10ms per pattern (enforced by tests)

### Optimization Strategies

1. **Pre-compiled patterns** - RegExp compiled at module load
2. **Map-based lookups** - O(1) store configuration access
3. **Minimal validation** - Zod validation in dev, lightweight in prod
4. **esbuild bundling** - Fast cold starts with optimized bundles
5. **Immutable data** - No accidental mutations, predictable behavior

## Contributing

### Workflow

1. **Create feature branch** from `main`
   ```bash
   git checkout -b feature/my-feature
   ```
2. **Make changes** with tests
3. **Commit** using conventional commits
   ```bash
   git commit -m "feat: add new URL pattern for Store X"
   ```
4. **Push** and create PR
   ```bash
   git push origin feature/my-feature
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build/tooling changes

**Pre-commit hooks will:**

- Lint and format staged files
- Validate commit message format
- Run type checking

## Project Status

### Current Features ✅

- URL parsing and normalization
- Product ID extraction from URL patterns
- Store configuration for 100+ retailers
- Single and batch URL analysis endpoints
- OpenAPI documentation with Redoc
- Comprehensive test suites (780+ tests)
- High-performance optimizations

### Future Enhancements 🚧

- **JSON-LD Schema Parsing** - Extract SKUs from schema.org Product markup
- **DynamoDB Integration** - Cache URL analysis results
- **Event-Driven Architecture** - SQS/EventBridge integration
- **Snowflake Analytics** - Store analysis results for pattern improvement
- **Pattern Management UI** - Admin interface for managing store patterns

## License

Internal Rakuten project - All rights reserved

## Support

For questions or issues:

- Check package READMEs for detailed documentation
- Review [CLAUDE.md](CLAUDE.md) for development guidelines
- Check existing GitHub issues
- Create new issue with reproduction steps

---

Built with ❤️ by the RR Product Service Team
