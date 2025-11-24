# Product Service

Lambda functions for product parsing and ID extraction, built with AWS SAM.

## Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20.x or later
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

### Test Locally

Invoke a function locally:

```bash
pnpm invoke:local PostProductFunction --event events/post-product.json
```

## Building

Build the Lambda functions:

```bash
pnpm build
```

This uses SAM's built-in esbuild support to bundle TypeScript code with all workspace dependencies.

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
pnpm logs -- -n PostProductFunction
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
│   ├── functions/
│   │   └── postProduct/        # Lambda function
│   │       ├── handler.ts      # Function entry point
│   │       └── schema.ts       # Request validation
│   └── middleware/
│       └── zodValidator.ts     # Shared middleware
├── template.yaml               # SAM template (CloudFormation)
├── samconfig.toml              # SAM deployment config
└── package.json
```

## Adding New Functions

1. Create a new function directory:

   ```bash
   mkdir -p src/functions/getProduct
   ```

2. Add handler and schema:

   ```typescript
   // src/functions/getProduct/handler.ts
   export const handler = async (event) => { ... }
   ```

3. Update `template.yaml`:

   ```yaml
   GetProductFunction:
     Type: AWS::Serverless::Function
     Metadata:
       BuildMethod: esbuild
       BuildProperties:
         EntryPoints:
           - src/functions/getProduct/handler.ts
     Properties:
       Handler: handler.handler
       Events:
         GetProduct:
           Type: Api
           Properties:
             Path: /product/{id}
             Method: get
   ```

4. Build and deploy:
   ```bash
   pnpm build && pnpm deploy
   ```

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

## Testing

Tests are managed at the package level. See individual packages in `packages/` for test suites.

## Packages Used

This service depends on the following workspace packages:

- `@rr/url-parser` - URL parsing and normalization
- `@rr/product-id-extractor` - Extract product IDs from URLs
- `@rr/store-registry` - Store configuration and patterns
- `@rr/schema-parser` - Product schema validation
- `@rr/shared` - Shared utilities and types

## Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [SAM TypeScript Examples](https://github.com/aws-samples/aws-sam-typescript-layers-example)
