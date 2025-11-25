import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractProductIdsHandler } from '../handler';
import { extractProductIdsResponseSchema } from '../schema';
import type { ErrorResponse, ExtractProductIdsResponse } from '../types';

describe('Extract Product IDs Handler', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const createMockEvent = (
    queryStringParameters: Record<string, string> | null = null,
  ): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/extract-product-ids',
    headers: {},
    queryStringParameters,
    pathParameters: null,
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as never,
    resource: '',
  });

  describe('successful responses', () => {
    it('should return 200 status code for valid URL', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should extract product IDs from URL', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ExtractProductIdsResponse;

      expect(body.productIds).toBeDefined();
      expect(Array.isArray(body.productIds)).toBe(true);
      expect(body.productIds.length).toBeGreaterThan(0);
    });

    it('should return the original URL in response', () => {
      const testUrl = 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100';
      const event = createMockEvent({ url: testUrl });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ExtractProductIdsResponse;

      expect(body.url).toBe(testUrl);
    });

    it('should return count of extracted IDs', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ExtractProductIdsResponse;

      expect(body.count).toBeDefined();
      expect(typeof body.count).toBe('number');
      expect(body.count).toBe(body.productIds.length);
    });

    it('should accept optional storeId parameter', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
        storeId: '12345',
      });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should return JSON content type header', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });
  });

  describe('response structure', () => {
    it('should return valid JSON body', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should validate against extractProductIdsResponseSchema', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body);

      // Should not throw validation error
      expect(() => extractProductIdsResponseSchema.parse(body)).not.toThrow();

      // Validate it returns the correct type
      const validated = extractProductIdsResponseSchema.parse(body);
      expect(validated).toEqual(body);
    });

    it('should include all required fields', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ExtractProductIdsResponse;

      expect(body).toHaveProperty('url');
      expect(body).toHaveProperty('productIds');
      expect(body).toHaveProperty('count');
    });

    it('should only include expected fields', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body);

      const keys = Object.keys(body);
      expect(keys).toHaveLength(3);
      expect(keys.sort()).toEqual(['count', 'productIds', 'url'].sort());
    });
  });

  describe('validation errors', () => {
    it('should return 400 when URL is missing', () => {
      const event = createMockEvent({});
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL is empty', () => {
      const event = createMockEvent({ url: '' });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL is invalid', () => {
      const event = createMockEvent({ url: 'not-a-valid-url' });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL uses non-HTTP(S) protocol', () => {
      const event = createMockEvent({ url: 'ftp://example.com/product/123' });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL points to localhost', () => {
      const event = createMockEvent({ url: 'http://localhost/product/123' });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL points to private IP', () => {
      const event = createMockEvent({ url: 'http://192.168.1.1/product/123' });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return error response structure for validation errors', () => {
      const event = createMockEvent({ url: 'invalid' });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode');
      expect(body.error).toBe('ValidationError');
      expect(body.statusCode).toBe(400);
    });

    it('should return descriptive error message for validation errors', () => {
      const event = createMockEvent({});
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body.message).toContain('url');
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should handle null queryStringParameters', () => {
      const event = createMockEvent(null);
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should handle events with headers', () => {
      const event = {
        ...createMockEvent({
          url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
        }),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent',
        },
      };
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle events with additional query parameters', () => {
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
        extraParam: 'should-be-ignored',
      });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('logging', () => {
    it('should log debug and info messages', () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent({
        url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
      });

      extractProductIdsHandler(event);

      // Should have logged debug and info messages
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Check that logs contain expected namespace
      const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
      const hasExpectedNamespace = logs.some(
        (log) => log.context?.namespace === 'product-service.extract-product-ids',
      );
      expect(hasExpectedNamespace).toBe(true);
    });

    it('should log validation errors', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const event = createMockEvent({ url: 'invalid-url' });

      extractProductIdsHandler(event);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0]).toBeDefined();
      const warnLog = JSON.parse(consoleWarnSpy.mock.calls[0]?.[0] as string);
      expect(warnLog.level).toBe('warn');
      expect(warnLog.message).toContain('Validation error');
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with no extractable IDs', () => {
      const event = createMockEvent({
        url: 'https://example.com',
      });
      const result = extractProductIdsHandler(event);
      const body = JSON.parse(result.body) as ExtractProductIdsResponse;

      expect(result.statusCode).toBe(200);
      expect(body.productIds).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should handle URLs with special characters', () => {
      const event = createMockEvent({
        url: 'https://example.com/product?id=abc-123_def',
      });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle very long URLs', () => {
      const longPath = 'a'.repeat(500);
      const event = createMockEvent({
        url: `https://example.com/${longPath}`,
      });
      const result = extractProductIdsHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });
});
