import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ErrorResponse,
  type NormalizeProductViewsResponse,
  normalizeProductViewsResponseSchema,
} from '../contracts';
import { normalizeProductViewsHandler } from '../handler';

describe('Normalize Product Views Handler', () => {
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
    path: '/product-views/normalize',
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

  const createValidProductView = (overrides: Record<string, unknown> = {}) => ({
    store_id: 5246,
    store_name: 'target.com',
    name: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
    url: 'https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt/-/A-88056717',
    sku: ['88056717'],
    offers: [{ price: 800, sku: '88056717' }],
    brand: 'A New Day',
    ...overrides,
  });

  describe('successful responses', () => {
    it('should return 200 status code for valid product view', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should normalize product view and extract products', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

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
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'storeId' in firstResult) {
        expect(firstResult.storeId).toBe('5246');
        expect(firstResult.storeName).toBe('target.com');
      }
    });

    it('should return count of normalized products', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'productCount' in firstResult) {
        expect(firstResult.productCount).toBeDefined();
        expect(typeof firstResult.productCount).toBe('number');
        expect(firstResult.productCount).toBe(1);
      }
    });

    it('should return JSON content type header', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle multiple product views', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView(),
          createValidProductView({ store_id: 8333, store_name: "Macy's" }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should include summary statistics', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(body.total).toBe(1);
      expect(body.successful).toBeDefined();
      expect(body.failed).toBeDefined();
      expect(body.totalProducts).toBeDefined();
      expect(body.successful + body.failed).toBe(body.total);
    });

    it('should handle store_id as string', async () => {
      const event = createMockEvent({
        events: [createValidProductView({ store_id: '5246' })],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'storeId' in firstResult) {
        expect(firstResult.storeId).toBe('5246');
      }
    });
  });

  describe('product ID extraction', () => {
    it('should extract SKUs from sku array', async () => {
      const event = createMockEvent({
        events: [createValidProductView({ sku: ['SKU-001', 'SKU-002'] })],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.productIds).toContain('SKU-001');
        expect(firstResult.products[0]?.productIds).toContain('SKU-002');
      }
    });

    it('should extract SKUs from offers', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView({
            sku: [],
            offers: [{ price: 1000, sku: 'OFFER-SKU' }],
          }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.productIds).toContain('OFFER-SKU');
      }
    });

    it('should extract IDs from App format (sku_list)', async () => {
      const event = createMockEvent({
        events: [
          {
            store_id: '8333',
            store_name: "Macy's",
            name: 'Test Product',
            url: 'https://macys.com/product',
            sku_list: ['APP-SKU-1', 'APP-SKU-2'],
            offer_list: [{ offer_amount: 2999, offer_sku: 'APP-SKU-1' }],
          },
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.productIds).toContain('APP-SKU-1');
        expect(firstResult.products[0]?.productIds).toContain('APP-SKU-2');
      }
    });

    it('should extract GTINs and MPNs', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView({
            gtin: ['0123456789012'],
            mpn: ['MPN-ABC'],
          }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.productIds).toContain('0123456789012');
        expect(firstResult.products[0]?.productIds).toContain('MPN-ABC');
      }
    });

    it('should deduplicate IDs from multiple sources', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView({
            sku: ['DUPE-SKU'],
            offers: [{ price: 800, sku: 'DUPE-SKU' }],
            urlToSku: { url1: 'DUPE-SKU' },
          }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        const dupeCount = firstResult.products[0]?.productIds.filter(
          (id) => id === 'DUPE-SKU',
        ).length;
        expect(dupeCount).toBe(1);
      }
    });
  });

  describe('metadata extraction', () => {
    it('should extract brand', async () => {
      const event = createMockEvent({
        events: [createValidProductView({ brand: 'Nike' })],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.brand).toBe('Nike');
      }
    });

    it('should extract rating', async () => {
      const event = createMockEvent({
        events: [createValidProductView({ rating: 4.5 })],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.rating).toBe(4.5);
      }
    });

    it('should extract category', async () => {
      const event = createMockEvent({
        events: [createValidProductView({ category: 'Electronics > TVs' })],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.category).toBe('Electronics > TVs');
      }
    });

    it('should fallback to breadcrumbs for category', async () => {
      const event = createMockEvent({
        events: [createValidProductView({ breadcrumbs: 'Home > Clothing > Shirts' })],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.category).toBe('Home > Clothing > Shirts');
      }
    });
  });

  describe('batch processing', () => {
    it('should process multiple views', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createValidProductView({ store_id: 5246 + i, store_name: `Store ${i}` }),
      );
      const event = createMockEvent({ events });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(10);
      expect(body.total).toBe(10);
      expect(body.successful).toBe(10);
      expect(body.failed).toBe(0);
    });

    it('should preserve view order in results', async () => {
      const events = [
        createValidProductView({ store_name: 'First' }),
        createValidProductView({ store_name: 'Second' }),
        createValidProductView({ store_name: 'Third' }),
      ];
      const event = createMockEvent({ events });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

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
  });

  describe('response structure', () => {
    it('should return valid JSON body', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should validate against normalizeProductViewsResponseSchema', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body);

      expect(() => normalizeProductViewsResponseSchema.parse(body)).not.toThrow();

      const validated = normalizeProductViewsResponseSchema.parse(body);
      expect(validated).toEqual(body);
    });

    it('should include all required fields', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(body).toHaveProperty('results');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('successful');
      expect(body).toHaveProperty('failed');
      expect(body).toHaveProperty('totalProducts');
    });

    it('should include success flag in results', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(body.results[0]).toHaveProperty('success');
      expect(body.results[0]?.success).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should return 400 when events array is missing', async () => {
      const event = createMockEvent({});
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when events array is empty', async () => {
      const event = createMockEvent({ events: [] });
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when events exceeds maximum (100)', async () => {
      const events = Array.from({ length: 101 }, () => createValidProductView());
      const event = createMockEvent({ events });
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body) as ErrorResponse;
      expect(body.message).toContain('100');
    });

    it('should return error response structure for validation errors', async () => {
      const event = createMockEvent({ events: [] });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode');
      expect(body.error).toBe('ValidationError');
      expect(body.statusCode).toBe(400);
    });
  });

  describe('event handling', () => {
    it('should handle null body', async () => {
      const event = createMockEvent(null);
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should handle events with additional body properties', async () => {
      const event = createMockEvent({
        events: [createValidProductView()],
        extraParam: 'should-be-ignored',
      });
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('edge cases', () => {
    it('should handle minimal product view', async () => {
      const event = createMockEvent({
        events: [
          {
            store_id: 1234,
            name: 'Minimal Product',
            url: 'https://example.com/product',
          },
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.title).toBe('Minimal Product');
      }
    });

    it('should handle product view with empty sku arrays', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView({
            sku: [],
            gtin: [],
            productID: [],
            mpn: [],
            offers: [],
          }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle product view with only store_id', async () => {
      const event = createMockEvent({
        events: [{ store_id: 1234 }],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'storeId' in firstResult) {
        expect(firstResult.storeId).toBe('1234');
      }
    });

    it('should handle product view with special characters in name', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView({
            name: "Women's 100% Cotton & Polyester T-Shirt (Size: M/L)",
          }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should extract price from offers', async () => {
      const event = createMockEvent({
        events: [
          createValidProductView({
            offers: [{ price: 2999, sku: 'SKU-1' }],
          }),
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.price).toBe(2999);
      }
    });

    it('should extract price from offer_list (App format)', async () => {
      const event = createMockEvent({
        events: [
          {
            store_id: '8333',
            name: 'App Product',
            url: 'https://example.com/product',
            offer_list: [{ offer_amount: 3999, offer_currency: 'USD' }],
          },
        ],
      });
      const result = await normalizeProductViewsHandler(event);
      const body = JSON.parse(result.body) as NormalizeProductViewsResponse;

      const firstResult = body.results[0];
      if (firstResult && 'products' in firstResult) {
        expect(firstResult.products[0]?.price).toBe(3999);
      }
    });
  });

  describe('logging', () => {
    it('should log debug and info messages', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent({
        events: [createValidProductView()],
      });

      await normalizeProductViewsHandler(event);

      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
      const hasExpectedNamespace = logs.some(
        (log) => log.context?.namespace === 'product-service.normalize-product-views',
      );
      expect(hasExpectedNamespace).toBe(true);
    });

    it('should log validation errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const event = createMockEvent({ events: [] });

      await normalizeProductViewsHandler(event);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnLog = JSON.parse(consoleWarnSpy.mock.calls[0]?.[0] as string);
      expect(warnLog.level).toBe('warn');
      expect(warnLog.message).toContain('Validation error');
    });
  });
});
