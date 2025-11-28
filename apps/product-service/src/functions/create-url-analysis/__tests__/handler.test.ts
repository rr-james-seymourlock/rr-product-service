import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CreateUrlAnalysisResponse,
  type ErrorResponse,
  createUrlAnalysisResponseSchema,
} from '../contracts';
import { createUrlAnalysisHandler } from '../handler';

describe('Create URL Analysis Handler', () => {
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
    path: '/url-analysis',
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

  describe('successful responses', () => {
    it('should return 200 status code for valid URL', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should extract product IDs from URL', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBe(1);

      const firstResult = body.results[0];
      if (firstResult && 'productIds' in firstResult) {
        expect(Array.isArray(firstResult.productIds)).toBe(true);
        expect(firstResult.productIds.length).toBeGreaterThan(0);
      }
    });

    it('should return the original URL in response', async () => {
      const testUrl = 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100';
      const event = createMockEvent({ urls: [{ url: testUrl }] });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(body.results[0]?.url).toBe(testUrl);
    });

    it('should return count of extracted IDs', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      const firstResult = body.results[0];
      if (firstResult && 'productIds' in firstResult) {
        expect(firstResult.count).toBeDefined();
        expect(typeof firstResult.count).toBe('number');
        expect(firstResult.count).toBe(firstResult.productIds.length);
      }
    });

    it('should accept optional storeId parameter', async () => {
      const event = createMockEvent({
        urls: [
          {
            url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
            storeId: '12345',
          },
        ],
      });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should return JSON content type header', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle multiple URLs', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should include summary statistics', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://example.com' },
        ],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(body.total).toBe(2);
      expect(body.successful).toBeDefined();
      expect(body.failed).toBeDefined();
      expect(body.successful + body.failed).toBe(body.total);
    });
  });

  describe('response structure', () => {
    it('should return valid JSON body', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should validate against createUrlAnalysisResponseSchema', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body);

      // Should not throw validation error
      expect(() => createUrlAnalysisResponseSchema.parse(body)).not.toThrow();

      // Validate it returns the correct type
      const validated = createUrlAnalysisResponseSchema.parse(body);
      expect(validated).toEqual(body);
    });

    it('should include all required fields', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(body).toHaveProperty('results');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('successful');
      expect(body).toHaveProperty('failed');
    });

    it('should include success flag in results', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(body.results[0]).toHaveProperty('success');
      expect(body.results[0]?.success).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should return 400 when urls array is missing', async () => {
      const event = createMockEvent({});
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when urls array is empty', async () => {
      const event = createMockEvent({ urls: [] });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL is empty', async () => {
      const event = createMockEvent({ urls: [{ url: '' }] });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL is invalid', async () => {
      const event = createMockEvent({ urls: [{ url: 'not-a-valid-url' }] });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL uses non-HTTP(S) protocol', async () => {
      const event = createMockEvent({ urls: [{ url: 'ftp://example.com/product/123' }] });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL points to localhost', async () => {
      const event = createMockEvent({ urls: [{ url: 'http://localhost/product/123' }] });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL points to private IP', async () => {
      const event = createMockEvent({ urls: [{ url: 'http://192.168.1.1/product/123' }] });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return error response structure for validation errors', async () => {
      const event = createMockEvent({ urls: [{ url: 'invalid' }] });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode');
      expect(body.error).toBe('ValidationError');
      expect(body.statusCode).toBe(400);
    });

    it('should return descriptive error message for validation errors', async () => {
      const event = createMockEvent({});
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body.message).toContain('urls');
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should handle null body', async () => {
      const event = createMockEvent(null);
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should handle events with headers', async () => {
      const event = {
        ...createMockEvent({
          urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
        }),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent',
        },
      };
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle events with additional body properties', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
        extraParam: 'should-be-ignored',
      });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('logging', () => {
    it('should log debug and info messages', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });

      await createUrlAnalysisHandler(event);

      // Should have logged debug and info messages
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Check that logs contain expected namespace
      const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
      const hasExpectedNamespace = logs.some(
        (log) => log.context?.namespace === 'product-service.create-url-analysis',
      );
      expect(hasExpectedNamespace).toBe(true);
    });

    it('should log validation errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const event = createMockEvent({ urls: [{ url: 'invalid-url' }] });

      await createUrlAnalysisHandler(event);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0]).toBeDefined();
      const warnLog = JSON.parse(consoleWarnSpy.mock.calls[0]?.[0] as string);
      expect(warnLog.level).toBe('warn');
      expect(warnLog.message).toContain('Validation error');
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with no extractable IDs', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://example.com' }],
      });
      const result = await createUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      const firstResult = body.results[0];
      if (firstResult && 'productIds' in firstResult) {
        expect(firstResult.productIds).toEqual([]);
        expect(firstResult.count).toBe(0);
      }
    });

    it('should handle URLs with special characters', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://example.com/product?id=abc-123_def' }],
      });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle very long URLs', async () => {
      const longPath = 'a'.repeat(500);
      const event = createMockEvent({
        urls: [{ url: `https://example.com/${longPath}` }],
      });
      const result = await createUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });
});
