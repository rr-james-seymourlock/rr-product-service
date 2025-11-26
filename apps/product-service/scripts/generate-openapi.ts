/**
 * Generate OpenAPI specification from Zod schemas
 *
 * This script creates an openapi.json file from our contract schemas,
 * ensuring API documentation stays in sync with runtime validation.
 */
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  errorResponseSchema as batchErrorResponseSchema,
  createBatchUrlAnalysisRequestSchema,
  createBatchUrlAnalysisResponseSchema,
} from '../src/functions/create-batch-url-analysis/contracts';
import {
  convertAsinRequestSchema,
  convertAsinResponseSchema,
} from '../src/functions/convert-asin/contracts';
import {
  createUrlAnalysisRequestSchema,
  createUrlAnalysisResponseSchema,
  errorResponseSchema,
} from '../src/functions/create-url-analysis/contracts';
import { healthResponseSchema } from '../src/functions/health/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create registry and register schemas
const registry = new OpenAPIRegistry();

// Register health endpoint
registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health Check',
  description: 'Health check endpoint for monitoring and load balancer probes',
  tags: ['Monitoring'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

// Register URL analysis endpoint
registry.registerPath({
  method: 'post',
  path: '/url-analysis',
  summary: 'Analyze URL',
  description:
    'Analyzes a product URL and extracts product identifiers. Supports URLs from various e-commerce stores. Returns extracted product identifiers found in the URL path, query parameters, or fragments.',
  tags: ['Product Extraction'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createUrlAnalysisRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully extracted product IDs',
      content: {
        'application/json': {
          schema: createUrlAnalysisResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'url: Invalid URL format',
            statusCode: 400,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            error: 'InternalServerError',
            message: 'An unexpected error occurred',
            statusCode: 500,
          },
        },
      },
    },
  },
});

// Register batch URL analysis endpoint
registry.registerPath({
  method: 'post',
  path: '/url-analysis/batch',
  summary: 'Analyze URLs in Batch',
  description:
    'Analyzes multiple product URLs in parallel and extracts product identifiers. Accepts 1-100 URLs per request. Handles partial failures gracefully - each URL is processed independently and results include success/failure status. Returns summary statistics along with individual results.',
  tags: ['Product Extraction'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createBatchUrlAnalysisRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Batch processing completed (may include partial failures)',
      content: {
        'application/json': {
          schema: createBatchUrlAnalysisResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: batchErrorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'urls: At least one URL is required',
            statusCode: 400,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: batchErrorResponseSchema,
          example: {
            error: 'InternalServerError',
            message: 'An unexpected error occurred',
            statusCode: 500,
          },
        },
      },
    },
  },
});

// Register ASIN conversion endpoint
registry.registerPath({
  method: 'post',
  path: '/convert-asin',
  summary: 'Convert ASIN to GTIN',
  description:
    'Converts Amazon Standard Identification Numbers (ASINs) to Global Trade Item Numbers (GTINs) including UPC, SKU, and MPN. Uses the Synccentric product database API. Accepts 1-10 ASINs per request and returns all available product identifiers.',
  tags: ['Product Extraction'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: convertAsinRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully converted ASINs to GTINs',
      content: {
        'application/json': {
          schema: convertAsinResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'asins: Array must contain at least 1 element(s)',
            statusCode: 400,
          },
        },
      },
    },
    404: {
      description: 'Product not found in Synccentric database',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            error: 'ProductNotFoundError',
            message: 'Product not found for ASINs: B0EXAMPLE',
            statusCode: 404,
          },
        },
      },
    },
    500: {
      description: 'Internal server error or API error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            error: 'ApiRequestError',
            message: 'Synccentric API request failed: 500 Internal Server Error',
            statusCode: 502,
          },
        },
      },
    },
  },
});

// Generate OpenAPI document
const generator = new OpenApiGeneratorV31(registry.definitions);
const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'RR Product Service API',
    version: '1.0.0',
    description:
      'Product service API for extracting product identifiers from e-commerce URLs. Supports URL parsing, normalization, and pattern-based ID extraction for Rakuten merchant stores.',
    contact: {
      name: 'RR Product Service Team',
    },
  },
  servers: [
    {
      url: 'https://api.example.com/prod',
      description: 'Production',
    },
    {
      url: 'https://api.example.com/dev',
      description: 'Development',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local',
    },
  ],
  tags: [
    {
      name: 'Monitoring',
      description: 'Service health and monitoring endpoints',
    },
    {
      name: 'Product Extraction',
      description: 'Product identifier extraction endpoints',
    },
  ],
});

// Write to file
const outputPath = path.join(__dirname, '../docs/openapi.json');
const docsDir = path.dirname(outputPath);

// Ensure docs directory exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

console.log('✓ OpenAPI specification generated successfully');
console.log(`✓ Output: ${outputPath}`);
