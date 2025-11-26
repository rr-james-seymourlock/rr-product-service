/**
 * Generate OpenAPI specification from Zod schemas
 *
 * This script creates an openapi.json file from our contract schemas,
 * ensuring API documentation stays in sync with runtime validation.
 */
import { createDocument } from '@asteasolutions/zod-to-openapi';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  errorResponseSchema,
  extractProductIdsRequestSchema,
  extractProductIdsResponseSchema,
} from '../src/contracts/extract-product-ids';
import { healthResponseSchema } from '../src/contracts/health';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create OpenAPI document
const document = createDocument({
  openapi: '3.0.0',
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
  paths: {
    '/health': {
      get: {
        summary: 'Health Check',
        description: 'Health check endpoint for monitoring and load balancer probes',
        tags: ['Monitoring'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: healthResponseSchema,
              },
            },
          },
        },
      },
    },
    '/extract-product-ids': {
      get: {
        summary: 'Extract Product IDs',
        description:
          'Extract product IDs from a given product URL. Supports URLs from various e-commerce stores. Returns extracted product identifiers found in the URL path, query parameters, or fragments.',
        tags: ['Product Extraction'],
        parameters: [
          {
            in: 'query',
            name: 'url',
            required: true,
            schema: extractProductIdsRequestSchema.shape.url,
            description: 'Product URL to extract IDs from',
          },
          {
            in: 'query',
            name: 'storeId',
            required: false,
            schema: extractProductIdsRequestSchema.shape.storeId,
            description: 'Optional store ID for specific extraction patterns',
          },
        ],
        responses: {
          '200': {
            description: 'Successfully extracted product IDs',
            content: {
              'application/json': {
                schema: extractProductIdsResponseSchema,
              },
            },
          },
          '400': {
            description: 'Invalid request parameters',
            content: {
              'application/json': {
                schema: errorResponseSchema,
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: errorResponseSchema,
              },
            },
          },
        },
      },
    },
  },
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
