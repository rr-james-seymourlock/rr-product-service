# @rr/shared

Shared utilities, types, and constants used across all packages in the rr-product-service monorepo.

## Overview

### What it does

The shared package provides common functionality that's used by multiple packages in the monorepo. It centralizes logging infrastructure, type definitions, and constants to avoid duplication and ensure consistency across the product service.

### Why it exists

In a monorepo with multiple packages, certain utilities and types are used everywhere:

- **Logger** - Every package needs structured logging with consistent format and behavior
- **Common types** - Shared TypeScript types used across multiple packages
- **Constants** - Cross-cutting values like environment configs, defaults, timeouts

Without a shared package, each package would:
- Duplicate logger implementations
- Copy-paste type definitions
- Risk inconsistent behavior across the codebase
- Make it harder to update shared functionality

The `@rr/shared` package provides:
- **Centralized logger** - Production-grade Pino-based structured logging
- **Consistent API** - Same logging interface across all packages
- **Future extensibility** - Ready for shared types, constants, and utilities
- **Performance optimized** - AWS Lambda-optimized configuration
- **Test-friendly** - Simple console logging in test mode

### Where it's used

The shared package is a dependency of all other packages in the monorepo:

```
@rr/shared
    ↓
┌───────────────────────────────────────┐
│   Used by all packages:               │
├───────────────────────────────────────┤
│  @rr/url-parser                       │
│  @rr/product-id-extractor             │
│  @rr/store-registry                   │
│  @rr/schema-parser                    │
│  @rr/product-service (Lambda handlers)│
└───────────────────────────────────────┘
```

Every package imports the logger:
```typescript
import { createLogger } from '@rr/shared/utils';

const logger = createLogger('my-package-name');
```

### When to use it

Use this package when you need to:
- Create structured JSON logs from any package
- Add types/constants shared across multiple packages
- Implement utilities used by 2+ packages in the monorepo
- Ensure consistent behavior across the entire service

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

### Current Features

- **Production-grade logger** - Pino-based structured logging (5x faster than Winston/Bunyan)
- **AWS Lambda optimized** - No hostname/pid overhead, CloudWatch-compatible JSON
- **Pretty printing** - Human-readable output in development mode
- **Test-compatible** - Simple console logging when `NODE_ENV=test`
- **Child loggers** - Request-scoped context inheritance
- **Flexible API** - Multiple call patterns (message, context, error)
- **Type-safe** - Full TypeScript support

### Future Features

The package structure supports additional shared code:
- **Shared types** - Common TypeScript types (`@rr/shared/types`)
- **Shared constants** - Cross-package constants (`@rr/shared/constants`)
- **Additional utilities** - More shared utilities as needed

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
// Import from subpaths for better tree-shaking
import { createLogger } from '@rr/shared/utils';
// import { SharedType } from '@rr/shared/types';     // Future
// import { CONSTANT } from '@rr/shared/constants';   // Future
```

## Usage

### Basic Logging

```typescript
import { createLogger } from '@rr/shared/utils';

const logger = createLogger('my-service');

logger.info('Server started');
// {"level":"info","message":"Server started","namespace":"my-service","time":"2025-11-24T23:07:56.017Z"}
```

### Logging with Context

```typescript
logger.info({ port: 3000, env: 'production' }, 'Server started');
// {"level":"info","port":3000,"env":"production","message":"Server started","namespace":"my-service","time":"..."}

// Context only (no message)
logger.info({ event: 'server.started', port: 3000 });
// {"level":"info","event":"server.started","port":3000,"namespace":"my-service","time":"..."}
```

### Error Logging

```typescript
try {
  throw new Error('Connection failed');
} catch (error) {
  logger.error(error, 'Failed to connect to database');
  // {"level":"error","err":{"type":"Error","message":"Connection failed","stack":"..."},"message":"Failed to connect to database",...}
}

// Error in context
logger.error({ error: err, url: 'https://example.com' }, 'Request failed');
```

### Child Loggers (Request-Scoped Context)

```typescript
// Create logger with additional context that's included in all logs
const requestLogger = logger.child({ requestId: 'abc-123', userId: 'user-456' });

requestLogger.info('Processing request');
// {"level":"info","requestId":"abc-123","userId":"user-456","message":"Processing request",...}

requestLogger.error({ statusCode: 500 }, 'Request failed');
// {"level":"error","requestId":"abc-123","userId":"user-456","statusCode":500,"message":"Request failed",...}
```

## API Reference

### `createLogger(namespace)`

Creates a logger instance with the given namespace.

**Parameters:**
- `namespace` (string) - Namespace for the logger (e.g., 'url-parser', 'product-id-extractor')

**Returns:**
- `Logger` - Logger instance with debug/info/warn/error methods

**Example:**

```typescript
const logger = createLogger('url-parser');
logger.info('Starting URL parsing');
```

### Logger Methods

All methods support multiple call patterns:

#### `logger.debug(message)` | `logger.debug(context, message?)` | `logger.debug(error, message?)`

Log debug-level messages (detailed trace information).

```typescript
logger.debug('Parsing URL');
logger.debug({ url: 'https://example.com' }, 'Parsing URL');
logger.debug(error, 'Parsing failed');
```

#### `logger.info(message)` | `logger.info(context, message?)` | `logger.info(error, message?)`

Log info-level messages (high-level operations).

```typescript
logger.info('Request received');
logger.info({ method: 'POST', path: '/api' }, 'Request received');
```

#### `logger.warn(message)` | `logger.warn(context, message?)` | `logger.warn(error, message?)`

Log warning messages (non-fatal issues).

```typescript
logger.warn('Deprecated API used');
logger.warn({ feature: 'oldApi' }, 'Deprecated API used');
```

#### `logger.error(message)` | `logger.error(context, message?)` | `logger.error(error, message?)`

Log error messages (failures).

```typescript
logger.error('Database connection failed');
logger.error(error, 'Database connection failed');
logger.error({ error, retries: 3 }, 'Database connection failed after retries');
```

### `logger.child(context)`

Create a child logger with additional context.

**Parameters:**
- `context` (Record<string, unknown>) - Additional context to include in all child logger logs

**Returns:**
- `Logger` - New logger instance with inherited context

**Example:**

```typescript
const parentLogger = createLogger('api');
const requestLogger = parentLogger.child({ requestId: 'req-123' });

requestLogger.info('Processing');
// Includes requestId in all logs from requestLogger
```

## Configuration

### Environment Variables

- `LOG_LEVEL` - Set log level (default: 'info'). Options: 'debug', 'info', 'warn', 'error'
- `NODE_ENV` - Controls pretty printing and test mode
  - `development` - Pretty printed, colorized output
  - `production` - Raw JSON for CloudWatch
  - `test` - Simple console logging for test compatibility
- `AWS_LAMBDA_FUNCTION_NAME` - Automatically included in logs when running in Lambda

### Logger Configuration

The logger is optimized for AWS Lambda:

```typescript
{
  level: process.env.LOG_LEVEL || 'info',
  base: {
    // No hostname/pid (not useful in Lambda, adds overhead)
    function: process.env.AWS_LAMBDA_FUNCTION_NAME, // Added automatically
  },
  timestamp: 'ISO 8601 format',
  formatters: {
    level: (label) => ({ level: label }), // Consistent with other services
  },
}
```

## Log Levels

### When to Use Each Level

- **debug** - Detailed diagnostic information (disabled in production by default)
  - Example: "Pattern matched: /product/\\d+/"
  - Use case: Tracing execution flow, debugging issues

- **info** - High-level operational events (default level)
  - Example: "URL parsed successfully", "Store config loaded"
  - Use case: Normal application flow, audit trail

- **warn** - Non-fatal issues that should be investigated
  - Example: "Pattern extraction timeout", "Result limit reached"
  - Use case: Degraded performance, deprecated features

- **error** - Failures and exceptions
  - Example: "URL parsing failed", "Database connection error"
  - Use case: Errors that need immediate attention

## Testing

### Test Mode

When `NODE_ENV=test`, the logger automatically switches to simple console logging:

```typescript
// In tests, logger outputs simple JSON to console
logger.info({ test: true }, 'Test message');
// {"level":"info","message":"Test message","context":{"test":true,"namespace":"my-service"},"time":"..."}
```

### Spying on Logs

```typescript
import { createLogger } from '@rr/shared/utils';
import { vi } from 'vitest';

const consoleLogSpy = vi.spyOn(console, 'log');
const logger = createLogger('test');

logger.info('Test message');

expect(consoleLogSpy).toHaveBeenCalledWith(
  expect.stringContaining('"message":"Test message"')
);
```

## Examples

### Package Logger

Every package creates its own logger:

```typescript
// packages/url-parser/src/logger.ts
import { createLogger } from '@rr/shared/utils';
export const logger = createLogger('url-parser');

// packages/product-id-extractor/src/logger.ts
import { createLogger } from '@rr/shared/utils';
export const logger = createLogger('product-id-extractor');
```

### Lambda Handler Logging

```typescript
import { createLogger } from '@rr/shared/utils';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const logger = createLogger('create-url-analysis');

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId;
  const requestLogger = logger.child({ requestId });

  requestLogger.info({ path: event.path }, 'Request received');

  try {
    // Process request
    requestLogger.info({ duration: 100 }, 'Request completed');
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    requestLogger.error(error, 'Request failed');
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
}
```

### Performance Logging

```typescript
const logger = createLogger('performance');

const startTime = Date.now();
// ... perform operation
const duration = Date.now() - startTime;

logger.info(
  {
    operation: 'extractIds',
    durationMs: duration,
    urlCount: 100,
  },
  'Operation completed',
);
```

## Performance

### Why Pino?

Pino is 5x faster than Winston and Bunyan:

- **Asynchronous logging** - Non-blocking I/O
- **Minimal overhead** - Optimized serialization
- **Zero dependencies** - Small bundle size
- **AWS Lambda optimized** - Minimal cold start impact

### Overhead

- **Cold start**: < 1ms initialization
- **Per log**: < 0.1ms (production)
- **Memory**: Minimal (single logger instance per namespace)

## Package Structure

```
packages/shared/
├── src/
│   ├── types/
│   │   └── index.ts       # Shared TypeScript types (future)
│   ├── constants/
│   │   └── index.ts       # Shared constants (future)
│   └── utils/
│       ├── index.ts       # Export createLogger
│       └── logger.ts      # Logger implementation
├── package.json
└── README.md
```

## Package Exports

```typescript
// Subpath exports for better tree-shaking
import { createLogger } from '@rr/shared/utils';

// Future exports
// import type { SharedType } from '@rr/shared/types';
// import { CONSTANT } from '@rr/shared/constants';
```

## Adding Shared Code

### When to Add to @rr/shared

Add code to this package when:
- Used by 2+ packages in the monorepo
- Represents cross-cutting concerns (logging, types, constants)
- Needs to be updated in sync across all packages

### How to Add Shared Types

```typescript
// packages/shared/src/types/index.ts
export type ProductId = string;
export type StoreId = string;

// Usage in other packages
import type { ProductId, StoreId } from '@rr/shared/types';
```

### How to Add Shared Constants

```typescript
// packages/shared/src/constants/index.ts
export const MAX_PRODUCT_IDS = 12;
export const DEFAULT_TIMEOUT_MS = 100;

// Usage in other packages
import { MAX_PRODUCT_IDS } from '@rr/shared/constants';
```

## Dependencies

- `pino` - Fast, structured logger for Node.js
- `pino-pretty` (dev) - Pretty printing for development mode

## Maintenance

When updating shared utilities:

1. Consider backward compatibility (all packages depend on this)
2. Run tests across all packages: `pnpm test`
3. Update this README with new exports
4. Document breaking changes in commit messages
5. Consider deprecation warnings for API changes

## Migration Notes

If migrating from individual loggers to `@rr/shared`:

```typescript
// Before (each package has own logger)
import pino from 'pino';
const logger = pino({ ... });

// After (use shared logger)
import { createLogger } from '@rr/shared/utils';
const logger = createLogger('package-name');
```

## Future Enhancements

Potential additions to this package:

- **Error classes** - Shared error class hierarchy
- **Validation helpers** - Common validation utilities
- **Type guards** - Reusable type narrowing functions
- **Testing utilities** - Shared test helpers
- **Configuration** - Environment config management
