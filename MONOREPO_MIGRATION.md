# Monorepo Migration Plan

## Overview

Migrate `rr-product-service` from a single-package repository to a Turborepo-based monorepo structure optimized for backend services and Lambda deployments.

## Current State Analysis

### Current Structure

```
rr-product-service/
├── src/
│   ├── lib/
│   │   ├── parseUrlComponents/
│   │   ├── extractIdsFromUrlComponents/
│   │   ├── storeRegistry/
│   │   └── [other libs]
│   ├── middleware/
│   ├── parseProductSchema/
│   └── handler.ts
├── package.json (npm-based, single package)
├── tsconfig.json
├── eslint.config.mts
└── serverless.yml
```

### Current Pain Points

1. All code in single package - no modular boundaries
2. Cannot share libs across multiple Lambda functions easily
3. No shared configuration inheritance
4. Difficult to add new services without code duplication
5. Build/test/lint all code even if only one part changed

## Target State

### Proposed Structure

```
rr-product-service/                    # Monorepo root
├── apps/
│   ├── product-parser-lambda/         # Main Lambda function
│   │   ├── src/
│   │   │   ├── handler.ts
│   │   │   └── middleware/
│   │   ├── serverless.yml
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── [future-lambda-functions]/     # Other Lambda services
│
├── packages/
│   ├── url-parser/                    # @rr/url-parser
│   │   ├── src/
│   │   │   ├── parseUrlComponents/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── product-id-extractor/          # @rr/product-id-extractor
│   │   ├── src/
│   │   │   ├── extractIdsFromUrlComponents/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── store-registry/                # @rr/store-registry
│   │   ├── src/
│   │   │   ├── storeRegistry/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── schema-parser/                 # @rr/schema-parser
│   │   ├── src/
│   │   │   ├── parseProductSchema/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                        # @rr/shared
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── constants/
│       ├── package.json
│       └── tsconfig.json
│
├── tooling/
│   ├── eslint/                        # @rr/eslint-config
│   │   ├── base.js
│   │   ├── lambda.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── typescript/                    # @rr/tsconfig
│   │   ├── base.json
│   │   ├── lambda.json
│   │   └── package.json
│   │
│   └── prettier/                      # @rr/prettier-config
│       ├── index.mjs
│       └── package.json
│
├── turbo/
│   └── generators/                    # Turbo code generators
│       └── config.ts
│
├── package.json                       # Root workspace configuration
├── pnpm-workspace.yaml                # PNPM workspace definition
├── turbo.json                         # Turborepo configuration
├── tsconfig.json                      # Root TypeScript config
└── .npmrc                             # PNPM configuration
```

## Key Technologies & Tools

### Core Monorepo Tools

1. **Turborepo** (`turbo@^2.6.1`)
   - Build orchestration and caching
   - Parallel task execution
   - Incremental builds based on file changes
   - Remote caching support

2. **PNPM** (`pnpm@^10.18.1`)
   - Efficient package management with hard links
   - Workspace support
   - Catalog feature for version management
   - Faster installs than npm/yarn

3. **@manypkg/cli** (`@manypkg/cli@^0.25.1`)
   - Ensures consistent package.json across workspaces
   - Fixes common workspace issues automatically

4. **syncpack** (via pnpm dlx)
   - Keeps dependency versions synchronized across packages
   - Prevents version conflicts

### Build & Development Tools

- **TypeScript** (`^5.9.3`) - Type safety across all packages
- **ESLint** (`^9.39.1`) - Linting with shared configs
- **Prettier** (`^3.6.2`) - Code formatting
- **Vitest** (`^4.0.10`) - Testing framework
- **esbuild** - Fast bundling for Lambda

## Package Naming Convention

All packages will use the `@rr/` namespace:

- `@rr/url-parser`
- `@rr/product-id-extractor`
- `@rr/store-registry`
- `@rr/schema-parser`
- `@rr/shared`
- `@rr/eslint-config`
- `@rr/tsconfig`
- `@rr/prettier-config`

## Migration Phases

### Phase 1: Setup Monorepo Infrastructure (Foundation)

#### 1.1 Install Core Dependencies

```bash
# Switch to PNPM
npm install -g pnpm@10.18.1

# Initialize PNPM workspace
pnpm init
```

#### 1.2 Create Root Configuration Files

**`pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
  - tooling/*

catalog:
  '@types/node': 24.10.1
  '@types/aws-lambda': 8.10.158
  'zod': 4.1.12
  'vitest': 4.0.10
  'typescript': 5.9.3
```

**`.npmrc`**

```
auto-install-peers=true
dedupe-peer-dependents=true
use-lockfile-v6=true
resolution-mode=highest
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

**`turbo.json`**

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "ui": "stream",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".serverless/**", "dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": ["node_modules/.cache/.eslintcache"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": ["node_modules/.cache/tsbuildinfo.json"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Root `package.json`**

```json
{
  "name": "rr-product-service-monorepo",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=22.21.0",
    "pnpm": ">=10.18.1"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev --parallel",
    "test": "turbo test",
    "lint": "turbo lint && manypkg check",
    "lint:fix": "turbo lint -- --fix && manypkg fix",
    "typecheck": "turbo typecheck",
    "format": "turbo format",
    "format:fix": "turbo format -- --write",
    "clean": "turbo clean",
    "clean:workspaces": "git clean -xdf node_modules",
    "syncpack:list": "pnpm dlx syncpack list-mismatches",
    "syncpack:fix": "pnpm dlx syncpack fix-mismatches"
  },
  "devDependencies": {
    "@manypkg/cli": "^0.25.1",
    "@turbo/gen": "^2.6.1",
    "prettier": "^3.6.2",
    "turbo": "^2.6.1",
    "typescript": "^5.9.3"
  },
  "packageManager": "pnpm@10.18.1"
}
```

#### 1.3 Create Tooling Packages

**`tooling/typescript/package.json`**

```json
{
  "name": "@rr/tsconfig",
  "private": true,
  "version": "0.1.0",
  "files": ["base.json", "lambda.json"]
}
```

**`tooling/typescript/base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "exclude": ["node_modules"]
}
```

**`tooling/typescript/lambda.json`**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "types": ["@types/aws-lambda", "@types/node"]
  }
}
```

**`tooling/eslint/package.json`** - Similar structure with base.js, lambda.js configs

**`tooling/prettier/package.json`** - Shared prettier configuration

### Phase 2: Create Package Structure

#### 2.1 URL Parser Package (`@rr/url-parser`)

**`packages/url-parser/package.json`**

```json
{
  "name": "@rr/url-parser",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./config": "./src/parseUrlComponents/parseUrlComponents.config.ts",
    "./types": "./src/parseUrlComponents/parseUrlComponents.schema.ts"
  },
  "scripts": {
    "clean": "rm -rf .turbo node_modules dist",
    "format": "prettier --check \"**/*.{ts,tsx}\"",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "normalize-url": "^8.1.0",
    "tldts": "^7.0.18",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@rr/eslint-config": "workspace:*",
    "@rr/prettier-config": "workspace:*",
    "@rr/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "vitest": "catalog:"
  },
  "typesVersions": {
    "*": {
      "*": ["src/*"]
    }
  }
}
```

**`packages/url-parser/tsconfig.json`**

```json
{
  "extends": "@rr/tsconfig/base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "node_modules/.cache/tsbuildinfo.json"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2.2 Similar Structure for Other Packages

- `@rr/product-id-extractor`
- `@rr/store-registry`
- `@rr/schema-parser`
- `@rr/shared`

### Phase 3: Create Lambda Application

#### 3.1 Product Parser Lambda App

**`apps/product-parser-lambda/package.json`**

```json
{
  "name": "@rr/product-parser-lambda",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "sls package",
    "deploy": "sls deploy",
    "offline": "sls offline",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "clean": "rm -rf .turbo node_modules .serverless dist"
  },
  "dependencies": {
    "@middy/core": "^6.4.5",
    "@middy/http-error-handler": "^6.4.5",
    "@middy/http-json-body-parser": "^6.4.5",
    "@middy/validator": "^6.4.5",
    "@rr/url-parser": "workspace:*",
    "@rr/product-id-extractor": "workspace:*",
    "@rr/store-registry": "workspace:*",
    "@rr/schema-parser": "workspace:*",
    "@rr/shared": "workspace:*",
    "aws-lambda": "^1.0.7"
  },
  "devDependencies": {
    "@rr/eslint-config": "workspace:*",
    "@rr/tsconfig": "workspace:*",
    "@types/aws-lambda": "catalog:",
    "serverless": "^3.40.0",
    "serverless-esbuild": "^1.56.0",
    "serverless-offline": "^13.9.0",
    "vitest": "catalog:"
  }
}
```

**`apps/product-parser-lambda/tsconfig.json`**

```json
{
  "extends": "@rr/tsconfig/lambda.json",
  "compilerOptions": {
    "tsBuildInfoFile": "node_modules/.cache/tsbuildinfo.json",
    "paths": {
      "@rr/url-parser": ["../../packages/url-parser/src"],
      "@rr/product-id-extractor": ["../../packages/product-id-extractor/src"],
      "@rr/store-registry": ["../../packages/store-registry/src"],
      "@rr/schema-parser": ["../../packages/schema-parser/src"],
      "@rr/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", ".serverless"]
}
```

### Phase 4: Migration Steps

#### Step 1: Create Directory Structure

```bash
mkdir -p apps/product-parser-lambda/src
mkdir -p packages/{url-parser,product-id-extractor,store-registry,schema-parser,shared}/src
mkdir -p tooling/{eslint,typescript,prettier}
mkdir -p turbo/generators
```

#### Step 2: Move Code to Packages

```bash
# Move parseUrlComponents to url-parser package
mv src/lib/parseUrlComponents packages/url-parser/src/

# Move extractIdsFromUrlComponents to product-id-extractor package
mv src/lib/extractIdsFromUrlComponents packages/product-id-extractor/src/

# Move storeRegistry to store-registry package
mv src/lib/storeRegistry packages/store-registry/src/

# Move parseProductSchema to schema-parser package
mv src/parseProductSchema packages/schema-parser/src/

# Move middleware and handler to Lambda app
mv src/middleware apps/product-parser-lambda/src/
mv src/handler.ts apps/product-parser-lambda/src/
```

#### Step 3: Update Import Paths

Replace all imports in the codebase:

```typescript
// Before
import { parseUrlComponents } from '@/lib/parseUrlComponents';

// After
import { parseUrlComponents } from '@rr/url-parser';
```

#### Step 4: Create Package Entry Points

Each package needs an `index.ts` that exports its public API:

**`packages/url-parser/src/index.ts`**

```typescript
export { parseUrlComponents } from './parseUrlComponents/parseUrlComponents';
export { parseDomain } from './parseUrlComponents/parseUrlComponents';
export type { URLComponents } from './parseUrlComponents/parseUrlComponents.schema';
```

#### Step 5: Update Tests

Move tests to stay colocated with code:

```bash
# Tests stay in __tests__ folders within each package
# Update import paths in all test files
```

#### Step 6: Configure Serverless for App

Move `serverless.yml` to `apps/product-parser-lambda/` and update paths:

```yaml
service: rr-product-parser-lambda

plugins:
  - serverless-esbuild
  - serverless-offline

provider:
  name: aws
  runtime: nodejs22.x

custom:
  esbuild:
    bundle: true
    minify: true
    external:
      - '@aws-sdk/*'

functions:
  productParser:
    handler: src/handler.handler
```

#### Step 7: Install Dependencies

```bash
# Install all dependencies
pnpm install

# Run manypkg to fix any issues
pnpm manypkg fix

# Sync versions
pnpm syncpack:fix
```

#### Step 8: Verify Build

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Phase 5: Optimization & Documentation

#### 5.1 Add Turbo Generators

Create generators for new packages/apps:

```bash
turbo gen
```

#### 5.2 Setup Remote Caching (Optional)

Configure Vercel remote caching for CI/CD speedup.

#### 5.3 Update Documentation

- README.md - Update development workflow
- CONTRIBUTING.md - Add monorepo contribution guidelines
- Package READMEs - Document each package's API

## Benefits of This Structure

### 1. **Modular Architecture**

- Each package has clear boundaries and responsibilities
- Easy to understand, test, and maintain
- Can version packages independently if needed

### 2. **Reusability**

- Packages can be used by multiple Lambda functions
- Easy to create new services that reuse existing packages
- Shared tooling ensures consistency

### 3. **Performance**

- Turborepo caching speeds up builds (only rebuild changed packages)
- PNPM reduces disk space and install time
- Parallel execution of tasks across packages

### 4. **Developer Experience**

- Clear import paths (`@rr/package-name`)
- Shared configs reduce duplication
- Type-safe imports across packages
- Hot reload works across package boundaries

### 5. **Scalability**

- Easy to add new Lambda functions (just copy app template)
- Easy to add new packages
- Can split packages further if needed
- Future: Can move packages to separate repos if necessary

### 6. **CI/CD Benefits**

- Only deploy affected packages/apps
- Cached builds speed up deployment
- Can run tests only for changed packages

## Testing Strategy

Each package maintains its own tests:

```
packages/url-parser/
  src/
    parseUrlComponents/
      __tests__/
        parseUrlComponents.test.ts
```

Run tests:

```bash
# All packages
pnpm test

# Specific package
pnpm --filter @rr/url-parser test

# With coverage
turbo test --coverage
```

## Deployment Strategy

### Individual Lambda Deployment

```bash
# Deploy single function
pnpm --filter @rr/product-parser-lambda deploy

# Build before deploy
pnpm build && pnpm --filter @rr/product-parser-lambda deploy
```

### CI/CD Integration

Turborepo can detect which packages changed and only deploy affected Lambdas:

```bash
turbo run deploy --filter=[origin/main...HEAD]
```

## Migration Checklist

- [ ] Phase 1: Setup monorepo infrastructure
  - [ ] Install PNPM
  - [ ] Create workspace configuration
  - [ ] Setup Turborepo
  - [ ] Create tooling packages
- [ ] Phase 2: Create package structure
  - [ ] Create url-parser package
  - [ ] Create product-id-extractor package
  - [ ] Create store-registry package
  - [ ] Create schema-parser package
  - [ ] Create shared package
- [ ] Phase 3: Create Lambda application
  - [ ] Create product-parser-lambda app
  - [ ] Configure serverless
  - [ ] Update handler imports
- [ ] Phase 4: Execute migration
  - [ ] Create directory structure
  - [ ] Move code to packages
  - [ ] Update import paths
  - [ ] Create package entry points
  - [ ] Move tests
  - [ ] Install dependencies
  - [ ] Verify builds
- [ ] Phase 5: Finalize
  - [ ] Update documentation
  - [ ] Setup generators
  - [ ] Configure CI/CD
  - [ ] Test deployment

## Rollback Plan

If migration fails:

1. Revert to `main` branch (pre-migration)
2. Keep migration branch for future attempts
3. Document issues encountered

Migration is done on `monorepo-migration` branch, so main is safe.

## Timeline Estimate

- **Phase 1** (Infrastructure): 2-3 hours
- **Phase 2** (Packages): 3-4 hours
- **Phase 3** (Lambda App): 1-2 hours
- **Phase 4** (Migration): 4-6 hours
- **Phase 5** (Polish): 2-3 hours

**Total**: 12-18 hours

## Next Steps

1. Review this migration plan
2. Address any questions or concerns
3. Begin Phase 1: Setup monorepo infrastructure
4. Test at each phase before proceeding
5. Update plan as needed based on discoveries

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
