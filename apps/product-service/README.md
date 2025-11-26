# Product Service

Lambda functions for product parsing and ID extraction, built with AWS SAM.

## Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 22.x or later
- PNPM 10.x or later
- Docker (for local development with SAM)

## Installation

```bash
# From monorepo root
pnpm install

# Or from this directory
pnpm install
```

## Development

### Local API

Start the API Gateway locally:

```bash
pnpm dev
```

This will start the API at `http://localhost:3000` with warm containers for faster response times.

### Available Endpoints

- `GET /health` - Health check endpoint
- `GET /extract-product-ids?url=<product-url>` - Extract product IDs from URLs

### Test Locally

Invoke a function locally with SAM:

```bash
# Health check
sam local invoke HealthFunction --event src/functions/health/event.json

# Extract product IDs
sam local invoke ExtractProductIdsFunction --event src/functions/extract-product-ids/event.json
```

## Testing

Run the test suite:

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm typecheck         # TypeScript type checking
pnpm lint              # ESLint
```

## Building

Build the Lambda functions with esbuild:

```bash
pnpm build
```

This bundles TypeScript code with all workspace dependencies into optimized Lambda packages.

## Deployment

### First Time Deployment

For your first deployment, use the guided process:

```bash
pnpm deploy:guided
```

This will prompt you for:

- Stack name (default: `rr-product-service`)
- AWS Region (default: `us-east-1`)
- Confirmation before deploy
- Saving configuration to `samconfig.toml`

### Subsequent Deployments

After the initial setup, simply run:

```bash
pnpm deploy
```

### Validate Template

Validate your SAM template before deploying:

```bash
pnpm validate
```

## Monitoring

### Tail Logs

Watch logs in real-time:

```bash
pnpm logs -- -n HealthFunction
pnpm logs -- -n ExtractProductIdsFunction
```

### Delete Stack

Remove the deployed stack:

```bash
pnpm delete
```

## Project Structure

```
apps/product-service/
├── src/
│   └── functions/
│       ├── health/                      # Health check function
│       │   ├── contracts.ts             # API schemas & types
│       │   ├── event.json               # Test event
│       │   ├── handler.ts               # Lambda handler
│       │   ├── logger.ts                # Function logger
│       │   └── __tests__/               # Test suite
│       └── extract-product-ids/         # Product ID extraction
│           ├── contracts.ts             # API schemas & types
│           ├── event.json               # Test event
│           ├── handler.ts               # Lambda handler
│           ├── logger.ts                # Function logger
│           └── __tests__/               # Test suite
├── scripts/
│   └── generate-openapi.ts              # OpenAPI spec generator
├── template.yaml                        # SAM template
├── esbuild.config.mjs                   # Build configuration
├── samconfig.toml                       # SAM deployment config
└── package.json
```

## Adding New Functions

Each function is self-contained with all its dependencies in one folder.

1. Create a new function directory:

   ```bash
   mkdir -p src/functions/myFunction
   ```

2. Add required files following the pattern:

   ```typescript
   // contracts.ts - API schemas with OpenAPI metadata
   import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
   import { z } from 'zod';

   extendZodWithOpenApi(z);

   export const myRequestSchema = z.object({
     // ... your schema
   }).openapi('MyRequest');

   // handler.ts - Lambda handler
   import middy from '@middy/core';
   import httpErrorHandler from '@middy/http-error-handler';

   export const myFunctionHandler = (event) => { ... };
   export const handler = middy(myFunctionHandler).use(httpErrorHandler());

   // logger.ts - Function logger
   import { createLogger } from '@rr/shared/utils';
   export const logger = createLogger('product-service.my-function');

   // event.json - Test event for SAM local
   { "httpMethod": "GET", "path": "/my-path", ... }
   ```

3. Update `esbuild.config.mjs`:

   ```javascript
   entryPoints: {
     health: 'src/functions/health/handler.ts',
     'extract-product-ids': 'src/functions/extract-product-ids/handler.ts',
     'my-function': 'src/functions/myFunction/handler.ts', // Add this
   }
   ```

4. Update `template.yaml`:

   ```yaml
   MyFunction:
     Type: AWS::Serverless::Function
     Properties:
       CodeUri: dist/
       Handler: my-function.handler
       Events:
         MyEvent:
           Type: Api
           Properties:
             Path: /my-path
             Method: get
   ```

5. Build and deploy:
   ```bash
   pnpm build && pnpm deploy
   ```

## API Documentation

Generate OpenAPI specification:

```bash
pnpm run openapi:generate
```

This creates `docs/openapi.json` from your contract schemas, ensuring API documentation stays in sync with runtime validation.

## Environment Variables

Configure environment variables in `template.yaml` under `Globals.Function.Environment.Variables`:

```yaml
Globals:
  Function:
    Environment:
      Variables:
        NODE_ENV: production
        LOG_LEVEL: info
```

## Packages Used

This service depends on the following workspace packages:

- `@rr/url-parser` - URL parsing and normalization
- `@rr/product-id-extractor` - Extract product IDs from URLs
- `@rr/store-registry` - Store configuration and patterns
- `@rr/schema-parser` - Product schema validation
- `@rr/shared` - Shared utilities (logger, types)

## Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [Middy.js Middleware](https://middy.js.org/)
- [Zod Validation](https://zod.dev/)
