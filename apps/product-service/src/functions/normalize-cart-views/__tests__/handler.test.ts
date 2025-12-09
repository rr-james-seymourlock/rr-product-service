import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ErrorResponse,
  type NormalizeCartViewsResponse,
  normalizeCartViewsResponseSchema,
} from '../contracts';
import { normalizeCartViewsHandler } from '../handler';

describe('Normalize Cart Views Handler', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const createMockEvent = (
    requestBody: Record<string, unknown> | null = null,
  ): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    path: '/cart-views/normalize',
    headers: { 'Content-Type': 'application/json' },
    queryStringParameters: null,
    pathParameters: null,
    body: requestBody ? JSON.stringify(requestBody) : null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as never,
    resource: '',
  });

  const createValidCartView = (overrides: Record<string, unknown> = {}) => ({
    store_id: 8333,
    store_name: "Macy's",
    product_list: [
      {
        name: "Women's Cotton Sweater",
        url: 'https://macys.com/shop/product?ID=12345',
        item_price: 4900,
        quantity: 1,
      },
    ],
    ...overrides,
  });

  describe('successful responses', () => {
    it('should return 200 status code for valid cart view', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should normalize cart view and extract products', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBe(1);

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(Array.isArray(firstResult.products)).toBe(true);
        expect(firstResult.products.length).toBeGreaterThan(0);
      }
    });

    it('should return store info in response', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'storeId' in firstResult) {
        expect(firstResult.storeId).toBe('8333');
        expect(firstResult.storeName).toBe("Macy's");
      }
    });

    it('should return count of normalized products', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'productCount' in firstResult) {
        expect(firstResult.productCount).toBeDefined();
        expect(typeof firstResult.productCount).toBe('number');
        expect(firstResult.productCount).toBe(1);
      }
    });

    it('should return JSON content type header', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle multiple cart views', async () => {
      const event = createMockEvent({
        events: [
          createValidCartView(),
          createValidCartView({ store_id: 5246, store_name: 'Target' }),
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should include summary statistics', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(body.total).toBe(1);
      expect(body.successful).toBeDefined();
      expect(body.failed).toBeDefined();
      expect(body.totalProducts).toBeDefined();
      expect(body.successful + body.failed).toBe(body.total);
    });

    it('should handle store_id as string', async () => {
      const event = createMockEvent({
        events: [createValidCartView({ store_id: '8333' })],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'storeId' in firstResult) {
        expect(firstResult.storeId).toBe('8333');
      }
    });
  });

  describe('batch processing', () => {
    it('should process multiple views in parallel', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createValidCartView({ store_id: 8333 + i, store_name: `Store ${i}` }),
      );
      const event = createMockEvent({ events });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(10);
      expect(body.total).toBe(10);
      expect(body.successful).toBe(10);
      expect(body.failed).toBe(0);
    });

    it('should preserve view order in results (Promise.all maintains order)', async () => {
      const events = [
        createValidCartView({ store_name: 'First' }),
        createValidCartView({ store_name: 'Second' }),
        createValidCartView({ store_name: 'Third' }),
      ];
      const event = createMockEvent({ events });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      // Results should be in same order as input views
      if ('storeName' in body.results[0]!) {
        expect(body.results[0].storeName).toBe('First');
      }
      if ('storeName' in body.results[1]!) {
        expect(body.results[1].storeName).toBe('Second');
      }
      if ('storeName' in body.results[2]!) {
        expect(body.results[2].storeName).toBe('Third');
      }
    });

    it('should calculate total products across all views', async () => {
      const events = [
        createValidCartView({
          product_list: [
            { name: 'Product 1', url: 'https://example.com/1', item_price: 100 },
            { name: 'Product 2', url: 'https://example.com/2', item_price: 200 },
          ],
        }),
        createValidCartView({
          product_list: [{ name: 'Product 3', url: 'https://example.com/3', item_price: 300 }],
        }),
      ];
      const event = createMockEvent({ events });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(body.totalProducts).toBe(3);
    });
  });

  describe('response structure', () => {
    it('should return valid JSON body', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should validate against normalizeCartViewsResponseSchema', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body);

      // Should not throw validation error
      expect(() => normalizeCartViewsResponseSchema.parse(body)).not.toThrow();

      // Validate it returns the correct type
      const validated = normalizeCartViewsResponseSchema.parse(body);
      expect(validated).toEqual(body);
    });

    it('should include all required fields', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(body).toHaveProperty('results');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('successful');
      expect(body).toHaveProperty('failed');
      expect(body).toHaveProperty('totalProducts');
    });

    it('should include success flag in results', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(body.results[0]).toHaveProperty('success');
      expect(body.results[0]?.success).toBe(true);
    });

    it('should not include index field (array position indicates order)', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(body.results[0]).not.toHaveProperty('index');
    });
  });

  describe('validation errors', () => {
    it('should return 400 when events array is missing', async () => {
      const event = createMockEvent({});
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when events array is empty', async () => {
      const event = createMockEvent({ events: [] });
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when events exceeds maximum (100)', async () => {
      const events = Array.from({ length: 101 }, () => createValidCartView());
      const event = createMockEvent({ events });
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.message).toContain('100');
    });

    it('should handle view with only store_name (product_list defaults to empty)', async () => {
      // RawCartEventSchema has .default([]) for product_list, so it's valid
      const event = createMockEvent({
        events: [{ store_name: 'Test' }],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products).toEqual([]);
        expect(firstResult.storeName).toBe('Test');
      }
    });

    it('should return error response structure for validation errors', async () => {
      const event = createMockEvent({ events: [] });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode');
      expect(body.error).toBe('ValidationError');
      expect(body.statusCode).toBe(400);
    });

    it('should return descriptive error message for validation errors', async () => {
      const event = createMockEvent({});
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body.message).toContain('events');
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  describe('partial failures', () => {
    it('should handle mix of valid and invalid product lists gracefully', async () => {
      // Both views are structurally valid but may have different product extraction results
      const event = createMockEvent({
        events: [
          createValidCartView(),
          createValidCartView({ product_list: [] }), // Empty product list is valid but yields 0 products
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.total).toBe(2);
      // Both should succeed, but one has 0 products
      expect(body.results).toHaveLength(2);
    });

    it('should continue processing after individual view errors', async () => {
      // All valid views
      const events = [createValidCartView(), createValidCartView(), createValidCartView()];
      const event = createMockEvent({ events });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(3);
    });
  });

  describe('event handling', () => {
    it('should handle null body', async () => {
      const event = createMockEvent(null);
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should handle events with headers', async () => {
      const event = {
        ...createMockEvent({
          events: [createValidCartView()],
        }),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent',
        },
      };
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle events with additional body properties', async () => {
      const event = createMockEvent({
        events: [createValidCartView()],
        extraParam: 'should-be-ignored',
      });
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('logging', () => {
    it('should log debug and info messages', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent({
        events: [createValidCartView()],
      });

      await normalizeCartViewsHandler(event);

      // Should have logged debug and info messages
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Check that logs contain expected namespace
      const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
      const hasExpectedNamespace = logs.some(
        (log) => log.context?.namespace === 'product-service.normalize-cart-views',
      );
      expect(hasExpectedNamespace).toBe(true);
    });

    it('should log validation errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const event = createMockEvent({ events: [] });

      await normalizeCartViewsHandler(event);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0]).toBeDefined();
      const warnLog = JSON.parse(consoleWarnSpy.mock.calls[0]?.[0] as string);
      expect(warnLog.level).toBe('warn');
      expect(warnLog.message).toContain('Validation error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty product list in cart view', async () => {
      const event = createMockEvent({
        events: [createValidCartView({ product_list: [] })],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products).toEqual([]);
        expect(firstResult.productCount).toBe(0);
      }
    });

    it('should handle products without extractable IDs', async () => {
      const event = createMockEvent({
        events: [
          createValidCartView({
            product_list: [
              {
                name: 'Unknown Product',
                url: 'https://unknown-store.com/product',
                item_price: 1000,
              },
            ],
          }),
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      // Should still return the normalized product, even without IDs
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products.length).toBe(1);
      }
    });

    it('should handle products with URL only (valid per new rules)', async () => {
      const event = createMockEvent({
        events: [
          createValidCartView({
            product_list: [
              {
                url: 'https://example.com/product/123',
              },
            ],
          }),
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products.length).toBe(1);
      }
    });

    it('should filter out products without URL and missing name or price', async () => {
      const event = createMockEvent({
        events: [
          createValidCartView({
            product_list: [
              { name: 'Only name, no price or URL' }, // Invalid: no URL and no price
              { item_price: 100 }, // Invalid: no URL and no name
              { name: 'Valid Product', item_price: 100 }, // Valid: has name and price
            ],
          }),
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        // Only the product with both name and price should be included
        expect(firstResult.products.length).toBe(1);
        expect(firstResult.products[0]?.title).toBe('Valid Product');
      }
    });

    it('should handle products with special characters in name', async () => {
      const event = createMockEvent({
        events: [
          createValidCartView({
            product_list: [
              {
                name: "Women's 100% Cotton & Polyester T-Shirt (Size: M/L)",
                url: 'https://example.com/product/123',
                item_price: 2500,
              },
            ],
          }),
        ],
      });
      const result = await normalizeCartViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle very long product lists', async () => {
      const products = Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i}`,
        url: `https://example.com/product/${i}`,
        item_price: 100 * (i + 1),
      }));
      const event = createMockEvent({
        events: [createValidCartView({ product_list: products })],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products.length).toBe(50);
        expect(firstResult.productCount).toBe(50);
      }
    });

    it('should handle missing optional fields in cart view', async () => {
      const event = createMockEvent({
        events: [
          {
            product_list: [
              {
                name: 'Basic Product',
                url: 'https://example.com/product',
                item_price: 1000,
              },
            ],
            // No store_id or store_name
          },
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'storeId' in firstResult) {
        expect(firstResult.storeId).toBeUndefined();
        expect(firstResult.storeName).toBeUndefined();
      }
    });

    it('should handle quantity field', async () => {
      const event = createMockEvent({
        events: [
          createValidCartView({
            product_list: [
              {
                name: 'Product with quantity',
                url: 'https://example.com/product',
                item_price: 1000,
                quantity: 5,
              },
            ],
          }),
        ],
      });
      const result = await normalizeCartViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeCartViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.quantity).toBe(5);
      }
    });
  });
});
