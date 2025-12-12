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
import {
  errorResponseSchema as enrichCartErrorResponseSchema,
  enrichCartRequestSchema,
  enrichCartResponseSchema,
} from '../src/functions/enrich-cart/contracts';
import {
  errorResponseSchema as fetchImagesErrorResponseSchema,
  fetchImagesRequestSchema,
  fetchImagesResponseSchema,
} from '../src/functions/fetch-images/contracts';
import { healthResponseSchema } from '../src/functions/health/contracts';
import {
  errorResponseSchema as cartErrorResponseSchema,
  normalizeCartViewsRequestSchema,
  normalizeCartViewsResponseSchema,
} from '../src/functions/normalize-cart-views/contracts';
import {
  normalizeProductViewsRequestSchema,
  normalizeProductViewsResponseSchema,
  errorResponseSchema as productErrorResponseSchema,
} from '../src/functions/normalize-product-views/contracts';

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
  path: '/cart-events/normalize',
  summary: 'Normalize Cart View Events',
  description:
    'Normalizes raw cart view events from Rakuten apps and extensions using @rr/cart-event-normalizer. Extracts product identifiers from URLs and standardizes the data format. Accepts 1-100 cart views per request. Handles partial failures gracefully - each view is processed independently and results include success/failure status. Returns normalized products with extracted IDs and summary statistics.',
  tags: ['Event Normalization'],
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
      description: 'Successfully normalized cart view events',
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

// Register product views normalization endpoint
registry.registerPath({
  method: 'post',
  path: '/product-events/normalize',
  summary: 'Normalize Product View Events',
  description:
    'Normalizes raw product view events (PDP visits) from Rakuten apps and extensions using @rr/product-event-normalizer. Consolidates product identifiers from multiple schema.org sources (SKU, GTIN, MPN, offers) and extracts IDs from URLs as fallback. Accepts 1-100 product views per request. Handles partial failures gracefully - each view is processed independently and results include success/failure status. Returns normalized products with comprehensive identifier coverage and summary statistics.',
  tags: ['Event Normalization'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: normalizeProductViewsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully normalized product view events',
      content: {
        'application/json': {
          schema: normalizeProductViewsResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: productErrorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'events: At least one product view is required',
            statusCode: 400,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: productErrorResponseSchema,
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

// Register image fetch endpoint
registry.registerPath({
  method: 'post',
  path: '/images/fetch',
  summary: 'Fetch and Store Product Images',
  description:
    'Fetches product images from merchant URLs and stores them locally (phase 1) or in S3 (phase 2). Uses appropriate headers (User-Agent, Referer) to reduce bot detection. Validates content-type (JPEG, PNG, WebP allowed) and size limits. Handles partial failures gracefully - each request is processed independently. Returns results with error categorization (permanent vs retriable) for retry logic. Designed for Lambda execution at scale.',
  tags: ['Image Processing'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: fetchImagesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image fetch results (may include both successes and failures)',
      content: {
        'application/json': {
          schema: fetchImagesResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: fetchImagesErrorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'requests: At least one request is required',
            statusCode: 400,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: fetchImagesErrorResponseSchema,
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

// Register cart enrichment endpoint
registry.registerPath({
  method: 'post',
  path: '/cart/enrich',
  summary: 'Enrich Cart Items with Product Data',
  description:
    'Enriches normalized cart items by matching them with normalized product view data using multiple strategies (SKU, variant SKU, URL, extracted IDs, title similarity). Returns enriched cart items with combined data, confidence scores, and provenance tracking. Accepts 1-50 cart items and up to 50 products per request. Supports configurable minimum confidence thresholds.',
  tags: ['Cart Enrichment'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: enrichCartRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully enriched cart items',
      content: {
        'application/json': {
          schema: enrichCartResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters or store ID mismatch',
      content: {
        'application/json': {
          schema: enrichCartErrorResponseSchema,
          example: {
            error: 'ValidationError',
            message: 'cart: At least one cart item is required',
            statusCode: 400,
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: enrichCartErrorResponseSchema,
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
      name: 'Event Normalization',
      description:
        'Normalize cart and product view events from apps and extensions using @rr/cart-event-normalizer and @rr/product-event-normalizer packages',
    },
    {
      name: 'Image Processing',
      description:
        'Fetch and store product images from merchant URLs using @rr/product-image-fetcher package',
    },
    {
      name: 'Cart Enrichment',
      description:
        'Enrich cart items by matching with product view data using @rr/cart-enricher package',
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
