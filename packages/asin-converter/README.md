# @rr/asin-converter

Convert Amazon ASIN identifiers to standard product IDs (UPC, SKU, MPN) using the Synccentric API.

## Overview

### What it does

The ASIN converter translates Amazon Standard Identification Numbers (ASINs) into universal product identifiers that can be used across multiple retailers and systems. It queries the Synccentric product database API to retrieve UPC (Universal Product Code), SKU (Stock Keeping Unit), and MPN (Manufacturer Part Number) for given ASINs.

### Why it exists

Amazon and Zappos (owned by Amazon) use ASINs as their primary product identifier. However, ASINs are:

- **Amazon-specific** - Not recognized by other retailers or product databases
- **Non-standard** - Different from industry-standard identifiers like UPC/EAN
- **Limited utility** - Can't be used for cross-retailer product matching or analytics

To work with products from Amazon and Zappos in a broader ecosystem, we need to convert ASINs to standard identifiers:

```
ASIN (B08N5WRWNW) → UPC (012345678905)
                  → SKU (VENDOR-SKU-123)
                  → MPN (MODEL-XYZ)
```

This enables:
- **Cross-retailer matching** - Match Amazon products with other stores
- **Analytics** - Track product performance across multiple channels
- **Inventory systems** - Integrate with standard inventory management
- **Price comparison** - Compare prices using universal identifiers

### Where it's used

**Current status:** The ASIN converter is fully implemented but not yet integrated into the product service handlers. It exists as a standalone package ready for future integration.

**Planned usage:**
```
Amazon/Zappos URL detected → Extract ASIN → convertAsins() → Standard product IDs
                                          (@rr/asin-converter)
                                                ↓
                                          Combined with URL-based extraction
                                          for comprehensive product data
```

**Future integration points:**
- Detect Amazon/Zappos URLs during URL analysis
- Extract ASIN from URL patterns
- Call ASIN converter to get standard IDs
- Return both ASIN and converted IDs in response
- Use converted IDs for downstream matching and analytics

### When to use it

Use this package when you need to:
- Convert Amazon ASINs to UPC, SKU, or MPN identifiers
- Work with Amazon/Zappos products in multi-retailer systems
- Match Amazon products against other retail databases
- Integrate Amazon product data with inventory systems
- Perform cross-platform product analytics

**Internal package**: This library is part of the rr-product-service monorepo and not published to npm.

## Features

- **Native fetch API** - Uses Node.js built-in fetch (Node 18+)
- **Type-safe** - Full TypeScript support with Zod validation
- **Comprehensive error handling** - Specific error classes for different failure scenarios
- **Timeout protection** - Configurable request timeouts with AbortController
- **Structured logging** - JSON-formatted logs via @rr/shared
- **Input validation** - Runtime validation of ASINs and configuration
- **Response validation** - Type-safe parsing of API responses
- **Multiple product IDs** - Returns all available identifiers (UPC, SKU, MPN)
- **Filtering** - Automatically filters out empty/undefined identifiers
- **Comprehensive tests** - 98%+ test coverage with Vitest

## Installation

This library is internal to the rr-product-service monorepo.

```typescript
import { convertAsins } from '@rr/asin-converter';
```

## Usage

### Basic Example

```typescript
import { convertAsins } from '@rr/asin-converter';

const config = {
  host: process.env.SYNCCENTRIC_HOST!,
  authKey: process.env.SYNCCENTRIC_AUTH_KEY!,
  timeout: 10000, // Optional, defaults to 10 seconds
};

const productIds = await convertAsins(['B08N5WRWNW'], config);
// Returns: ['012345678905', 'SKU-123', 'MPN-456']
```

### Converting Multiple ASINs

```typescript
const asins = ['B08N5WRWNW', 'B07ZPKN6YR', 'B09ABCDEFG'];
const productIds = await convertAsins(asins, config);

// Returns all product IDs found for the first matching product
// Note: Currently processes first ASIN, batch behavior TBD
```

### Error Handling

```typescript
import {
  convertAsins,
  ProductNotFoundError,
  ApiRequestError,
  ConfigurationError,
} from '@rr/asin-converter';

try {
  const productIds = await convertAsins(['B08N5WRWNW'], config);
  console.log('Product IDs:', productIds);
} catch (error) {
  if (error instanceof ProductNotFoundError) {
    // Product not in Synccentric database
    console.log('ASINs not found:', error.asins);
  } else if (error instanceof ApiRequestError) {
    // Network or API error
    console.error('API request failed:', error.message, error.statusCode);
  } else if (error instanceof ConfigurationError) {
    // Missing required configuration
    console.error('Configuration error:', error.message);
  } else {
    // Other errors
    console.error('Unexpected error:', error);
  }
}
```

### With Custom Timeout

```typescript
const config = {
  host: process.env.SYNCCENTRIC_HOST!,
  authKey: process.env.SYNCCENTRIC_AUTH_KEY!,
  timeout: 5000, // 5 second timeout
};

const productIds = await convertAsins(['B08N5WRWNW'], config);
```

## API Reference

### `convertAsins(asins, config)`

Converts ASIN identifiers to product IDs (UPC, SKU, MPN) using the Synccentric API.

**Parameters:**
- `asins` (string[]) - Array of ASIN identifiers to convert (must be non-empty array with non-empty strings)
- `config` (AsinConverterConfig) - Configuration object:
  - `host` (string, required) - Synccentric API host URL (e.g., 'https://api.synccentric.com')
  - `authKey` (string, required) - Synccentric API authentication key
  - `timeout` (number, optional) - Request timeout in milliseconds (default: 10000)

**Returns:**
- `Promise<string[]>` - Array of product identifiers (UPC, SKU, MPN) filtered for non-empty values

**Throws:**
- `InvalidInputError` - If input validation fails (empty array, empty strings, invalid type)
- `ConfigurationError` - If required configuration is missing (host or authKey)
- `ApiRequestError` - If the API request fails (network error, timeout, non-200 status)
- `ApiResponseError` - If the API response is invalid or contains errors
- `ProductNotFoundError` - If the product is not found in Synccentric database

**Example:**

```typescript
const config = {
  host: 'https://api.synccentric.com',
  authKey: process.env.SYNCCENTRIC_AUTH_KEY!,
  timeout: 10000,
};

const productIds = await convertAsins(['B08N5WRWNW'], config);
// Returns: ['012345678905', 'SKU-123', 'MPN-456']
```

## Configuration

### Environment Variables

**Required:**
- `SYNCCENTRIC_HOST` - Synccentric API base URL (e.g., 'https://api.synccentric.com')
- `SYNCCENTRIC_AUTH_KEY` - Authentication key for Synccentric API

**Example .env:**
```bash
SYNCCENTRIC_HOST=https://api.synccentric.com
SYNCCENTRIC_AUTH_KEY=your-api-key-here
```

### Configuration Object

```typescript
interface AsinConverterConfig {
  host: string;        // Required: API host URL
  authKey: string;     // Required: API auth key
  timeout?: number;    // Optional: Request timeout in ms (default: 10000)
}
```

## Error Classes

### `AsinConverterError`

Base error class for all ASIN converter errors.

```typescript
class AsinConverterError extends Error {
  constructor(message: string)
}
```

### `InvalidInputError`

Thrown when input validation fails.

```typescript
class InvalidInputError extends AsinConverterError {
  constructor(message?: string)  // Default: 'Invalid input provided'
}
```

**Causes:**
- Empty array of ASINs
- Array contains empty strings
- Input is not an array

### `ConfigurationError`

Thrown when required configuration is missing.

```typescript
class ConfigurationError extends AsinConverterError {
  constructor(message?: string)  // Default: 'Missing required configuration'
}
```

**Causes:**
- Missing `host` in config
- Missing `authKey` in config

### `ApiRequestError`

Thrown when the Synccentric API request fails.

```typescript
class ApiRequestError extends AsinConverterError {
  public readonly statusCode?: number;
  public readonly cause?: Error;

  constructor(message: string, statusCode?: number, cause?: Error)
}
```

**Causes:**
- Network connection failure
- Request timeout
- Non-200 HTTP status code
- Fetch errors

### `ApiResponseError`

Thrown when the API response cannot be parsed or is invalid.

```typescript
class ApiResponseError extends AsinConverterError {
  constructor(message?: string)  // Default: 'Invalid API response'
}
```

**Causes:**
- Invalid JSON structure
- Response doesn't match expected schema
- API returns error (not product_not_found)

### `ProductNotFoundError`

Thrown when a product is not found in the Synccentric database.

```typescript
class ProductNotFoundError extends AsinConverterError {
  public readonly asins: string[];

  constructor(asins: string[])
}
```

**Causes:**
- ASIN not in Synccentric database
- Invalid ASIN format
- Product discontinued or unavailable

## Logging

The package uses structured JSON logging via `@rr/shared/utils`.

### Log Output

```json
{
  "level": "info",
  "message": "Successfully converted ASINs to product IDs",
  "asins": ["B08N5WRWNW"],
  "productIds": ["012345678905", "SKU-123"],
  "count": 2,
  "namespace": "asin-converter",
  "time": "2025-11-26T13:00:00.000Z"
}
```

### Log Levels

- **debug** - Detailed conversion process (URL, request details)
- **info** - Successful conversions, product not found (expected)
- **warn** - Input validation failures
- **error** - API errors, network failures, unexpected errors

### Creating Child Loggers

```typescript
import { logger } from '@rr/asin-converter';

// Create request-scoped logger
const requestLogger = logger.child({ requestId: 'req-123' });

// All logs will include requestId
const productIds = await convertAsins(['B08N5WRWNW'], config);
```

## Testing

```bash
# Run all tests
pnpm --filter @rr/asin-converter test

# Run tests in watch mode
pnpm --filter @rr/asin-converter test:watch

# Type checking
pnpm --filter @rr/asin-converter typecheck
```

**Test Coverage:**
- `converter.test.ts` - Main conversion logic (successful conversion, error handling, timeouts)
- `errors.test.ts` - Error class behavior and inheritance
- `types.test.ts` - Zod schema validation

## TypeScript Support

Full TypeScript support with type inference from Zod schemas:

```typescript
import type { ConvertAsinsInput, ConvertAsinsOutput, AsinConverterConfig } from '@rr/asin-converter';

// Type-safe function signature
const convert = async (
  asins: ConvertAsinsInput,
  config: AsinConverterConfig,
): Promise<ConvertAsinsOutput> => {
  return await convertAsins(asins, config);
};
```

## API Details

### Synccentric API

The package integrates with the Synccentric product database API:

**Endpoint:** `GET /search`

**Query Parameters:**
- `identifier` - Comma-separated ASINs
- `type` - 'asin'
- `locale` - 'US'

**Request Headers:**
- `Authorization` - Bearer token authentication
- `Content-Type` - application/json

**Response Structure:**
```typescript
{
  data?: [{
    attributes: {
      upc?: string;
      sku?: string;
      mpn?: string;
    }
  }];
  errors?: [{
    id: string;
    title?: string;
    detail?: string;
  }];
}
```

**Error Codes:**
- `product_not_found` - ASIN not in database (handled specially)
- Other error codes result in `ApiResponseError`

## Future Enhancements

Deferred decisions for future implementation:

1. **Batch Behavior**
   - Currently processes first product in response
   - Future: Handle multiple ASINs with multiple responses

2. **Rate Limiting**
   - Implement request throttling
   - Respect API rate limits

3. **Caching**
   - Cache successful conversions
   - Reduce API calls for frequently requested ASINs

4. **Retry Logic**
   - Automatic retry on transient failures
   - Exponential backoff

5. **Response Priority**
   - Prefer UPC over SKU over MPN
   - Configurable ID type preferences

6. **Deduplication**
   - Handle duplicate IDs across types
   - Validate UPC format

7. **Production Environment**
   - Environment-specific configuration
   - Production vs. development behavior

## Use Cases

1. **Amazon Product Matching** - Match Amazon products with other retailers
2. **Cross-Platform Analytics** - Track product performance across Amazon and other stores
3. **Inventory Integration** - Sync Amazon inventory with standard systems
4. **Price Comparison** - Compare Amazon prices using UPC codes
5. **Data Enrichment** - Add standard identifiers to Amazon product data

## Dependencies

- `@rr/shared` - Shared utilities (logger)
- `zod` - Runtime validation and type inference

**No external HTTP dependencies** - Uses native Node.js fetch (Node 18+)

## Maintenance

When updating this package:

1. Maintain backward compatibility with config structure
2. Add new error types for new failure scenarios
3. Update tests when adding features
4. Document breaking changes in commit messages
5. Consider caching strategy before adding complex features
6. Update README with new examples and API changes

## Performance

- **Cold start:** < 1ms (no initialization overhead)
- **Per request:** ~100-500ms (network dependent)
- **Memory:** Minimal (single logger instance, no caching yet)
- **Dependencies:** Zero external HTTP libraries

## Migration from Legacy Code

Differences from the legacy implementation:

```typescript
// Before (legacy with axios)
import axiosClient from './axios';
const response = await axiosClient.get(url, { headers: { ... } });

// After (new with native fetch)
import { convertAsins } from '@rr/asin-converter';
const productIds = await convertAsins(asins, config);
```

**Key improvements:**
- No axios dependency (uses native fetch)
- Type-safe with Zod validation
- Comprehensive error handling
- Structured logging
- Full test coverage
- TypeScript types for all inputs/outputs
