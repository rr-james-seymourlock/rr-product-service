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
  convertAsinRequestSchema,
  convertAsinResponseSchema,
} from '../src/functions/convert-asin/contracts';
import {
  createUrlAnalysisRequestSchema,
  createUrlAnalysisResponseSchema,
  errorResponseSchema,
} from '../src/functions/create-url-analysis/contracts';
import { healthResponseSchema } from '../src/functions/health/contracts';
import {
  errorResponseSchema as cartErrorResponseSchema,
  normalizeCartViewsRequestSchema,
  normalizeCartViewsResponseSchema,
} from '../src/functions/normalize-cart-views/contracts';

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

// Register URL product identifier extraction endpoint
registry.registerPath({
  method: 'post',
  path: '/product-identifiers/urls',
  summary: 'Extract Product Identifiers from URLs',
  description:
    'Extracts product identifiers from one or more product URLs using pattern-based rule sets. Accepts 1-100 URLs per request. Handles partial failures gracefully - each URL is processed independently and results include success/failure status. Returns summary statistics along with individual results. Supports URLs from various e-commerce stores.',
  tags: ['Product Identifier Extraction'],
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

// Register ASIN to product identifier conversion endpoint
registry.registerPath({
  method: 'post',
  path: '/product-identifiers/asins',
  summary: 'Convert ASINs to Product Identifiers',
  description:
    'Converts Amazon Standard Identification Numbers (ASINs) to product identifiers including GTINs (UPC/EAN), MPN, and SKU. Uses the Synccentric product database API. Accepts 1-10 ASINs per request and returns all available product identifiers. Handles partial failures gracefully - each ASIN is processed independently and results include success/failure status.',
  tags: ['Product Identifier Extraction'],
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
      description: 'Successfully converted ASINs to product identifiers',
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
    500: {
      description: 'Internal server error or API error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            error: 'ApiRequestError',
            message: 'Synccentric API request failed: 500 Internal Server Error',
            statusCode: 500,
          },
        },
      },
    },
  },
});

// Register cart views normalization endpoint
registry.registerPath({
  method: 'post',
  path: '/cart-views/normalize',
  summary: 'Normalize Cart Views',
  description:
    'Normalizes raw cart view data from Rakuten apps and extensions, extracting product identifiers from URLs and standardizing the data format. Accepts 1-100 cart views per request. Handles partial failures gracefully - each view is processed independently and results include success/failure status. Returns normalized products with extracted IDs and summary statistics.',
  tags: ['Cart Data Processing'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: normalizeCartViewsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully normalized cart views',
      content: {
        'application/json': {
          schema: normalizeCartViewsResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: cartErrorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'events: At least one cart view is required',
            statusCode: 400,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: cartErrorResponseSchema,
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
      name: 'Product Identifier Extraction',
      description: 'Extract product identifiers from URLs and ASINs',
    },
    {
      name: 'Cart Data Processing',
      description: 'Normalize and process cart events from apps and extensions',
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
