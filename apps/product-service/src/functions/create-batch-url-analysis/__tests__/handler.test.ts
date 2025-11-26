import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CreateBatchUrlAnalysisResponse,
  type ErrorResponse,
  createBatchUrlAnalysisResponseSchema,
} from '../contracts';
import { createBatchUrlAnalysisHandler } from '../handler';

describe('Create Batch URL Analysis Handler', () => {
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
    path: '/url-analysis/batch',
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

  describe('successful batch processing', () => {
    it('should return 200 status code for valid batch request', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should process multiple URLs in parallel', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
          { url: 'https://www.amazon.com/dp/B08N5WRWNW' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(body.results).toHaveLength(3);
      expect(body.total).toBe(3);
    });

    it('should return results array with correct structure', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results[0]).toBeDefined();
      expect(body.results[0]?.success).toBe(true);
    });

    it('should include storeId when provided', async () => {
      const event = createMockEvent({
        urls: [
          {
            url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
            storeId: '12345',
          },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should return JSON content type header', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });
  });

  describe('partial failure scenarios', () => {
    it('should handle mix of successful and failed URLs', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://example.com' }, // Valid but no IDs
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should continue processing after individual URL failure', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(2);
    });

    it('should include error details for failed URLs', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://example.com' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      // Check that each result has a success field
      body.results.forEach((resultItem) => {
        expect(resultItem).toHaveProperty('success');
        expect(typeof resultItem.success).toBe('boolean');
      });
    });
  });

  describe('statistics calculation', () => {
    it('should return accurate total count', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
          { url: 'https://www.amazon.com/dp/B08N5WRWNW' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(body.total).toBe(3);
      expect(body.results).toHaveLength(3);
    });

    it('should return accurate successful count', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const expectedSuccessful = body.results.filter((r) => r.success).length;
      expect(body.successful).toBe(expectedSuccessful);
    });

    it('should return accurate failed count', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://example.com' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const expectedFailed = body.results.filter((r) => !r.success).length;
      expect(body.failed).toBe(expectedFailed);
    });

    it('should have total equal to successful plus failed', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
          { url: 'https://example.com' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(body.total).toBe(body.successful + body.failed);
    });
  });

  describe('response structure', () => {
    it('should return valid JSON body', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should validate against createBatchUrlAnalysisResponseSchema', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body);

      // Should not throw validation error
      expect(() => createBatchUrlAnalysisResponseSchema.parse(body)).not.toThrow();

      // Validate it returns the correct type
      const validated = createBatchUrlAnalysisResponseSchema.parse(body);
      expect(validated).toEqual(body);
    });

    it('should include all required fields', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(body).toHaveProperty('results');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('successful');
      expect(body).toHaveProperty('failed');
    });

    it('should only include expected fields', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body);

      const keys = Object.keys(body);
      expect(keys).toHaveLength(4);
      expect(keys.sort()).toEqual(['failed', 'results', 'successful', 'total'].sort());
    });

    it('should include url in each result', async () => {
      const testUrls = [
        'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
        'https://www.target.com/p/example-product/-/A-12345678',
      ];
      const event = createMockEvent({
        urls: testUrls.map((url) => ({ url })),
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      body.results.forEach((resultItem, index) => {
        expect(resultItem.url).toBe(testUrls[index]);
      });
    });
  });

  describe('successful result structure', () => {
    it('should have success=true for successful results', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const successResults = body.results.filter((r) => r.success);
      successResults.forEach((successResult) => {
        if (successResult.success) {
          expect(successResult).toHaveProperty('url');
          expect(successResult).toHaveProperty('productIds');
          expect(successResult).toHaveProperty('count');
          expect(successResult).toHaveProperty('success');
          expect(successResult.success).toBe(true);
        }
      });
    });

    it('should include productIds array for successful results', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const successResults = body.results.filter((r) => r.success);
      successResults.forEach((successResult) => {
        if (successResult.success) {
          expect(Array.isArray(successResult.productIds)).toBe(true);
        }
      });
    });

    it('should include count for successful results', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const successResults = body.results.filter((r) => r.success);
      successResults.forEach((successResult) => {
        if (successResult.success) {
          expect(typeof successResult.count).toBe('number');
          expect(successResult.count).toBe(successResult.productIds.length);
        }
      });
    });
  });

  describe('failure result structure', () => {
    it('should have success=false for failed results', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://example.com' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const failureResults = body.results.filter((r) => !r.success);
      failureResults.forEach((failureResult) => {
        expect(failureResult.success).toBe(false);
      });
    });

    it('should include error details for failed results', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://example.com' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      const failureResults = body.results.filter((r) => !r.success);
      failureResults.forEach((failureResult) => {
        if (!failureResult.success) {
          expect(failureResult).toHaveProperty('url');
          expect(failureResult).toHaveProperty('error');
          expect(failureResult).toHaveProperty('message');
          expect(failureResult).toHaveProperty('success');
          expect(typeof failureResult.error).toBe('string');
          expect(typeof failureResult.message).toBe('string');
        }
      });
    });
  });

  describe('validation errors', () => {
    it('should return 400 when urls array is missing', async () => {
      const event = createMockEvent({});
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when urls array is empty', async () => {
      const event = createMockEvent({ urls: [] });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when urls array exceeds maximum (100)', async () => {
      const tooManyUrls = Array(101)
        .fill(null)
        .map(() => ({ url: 'https://example.com/product/123' }));
      const event = createMockEvent({ urls: tooManyUrls });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL in batch is missing', async () => {
      const event = createMockEvent({
        urls: [{}],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL in batch is empty', async () => {
      const event = createMockEvent({
        urls: [{ url: '' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL in batch is invalid', async () => {
      const event = createMockEvent({
        urls: [{ url: 'not-a-valid-url' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL uses non-HTTP(S) protocol', async () => {
      const event = createMockEvent({
        urls: [{ url: 'ftp://example.com/product/123' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL points to localhost', async () => {
      const event = createMockEvent({
        urls: [{ url: 'http://localhost/product/123' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when URL points to private IP', async () => {
      const event = createMockEvent({
        urls: [{ url: 'http://192.168.1.1/product/123' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return error response structure for validation errors', async () => {
      const event = createMockEvent({ urls: [] });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode');
      expect(body.error).toBe('ValidationError');
      expect(body.statusCode).toBe(400);
    });

    it('should return descriptive error message for validation errors', async () => {
      const event = createMockEvent({});
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as ErrorResponse;

      expect(body.message).toContain('urls');
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should handle null body', async () => {
      const event = createMockEvent(null);
      const result = await createBatchUrlAnalysisHandler(event);

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
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle events with additional body properties', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
        extraParam: 'should-be-ignored',
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('logging', () => {
    it('should log debug and info messages', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });

      await createBatchUrlAnalysisHandler(event);

      // Should have logged debug and info messages
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Check that logs contain expected namespace
      const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
      const hasExpectedNamespace = logs.some(
        (log) => log.context?.namespace === 'product-service.create-batch-url-analysis',
      );
      expect(hasExpectedNamespace).toBe(true);
    });

    it('should log validation errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const event = createMockEvent({ urls: [] });

      await createBatchUrlAnalysisHandler(event);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0]).toBeDefined();
      const warnLog = JSON.parse(consoleWarnSpy.mock.calls[0]?.[0] as string);
      expect(warnLog.level).toBe('warn');
      expect(warnLog.message).toContain('Validation error');
    });

    it('should log batch processing statistics', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent({
        urls: [
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
        ],
      });

      await createBatchUrlAnalysisHandler(event);

      const logs = consoleLogSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
      const completedLog = logs.find((log) => log.message === 'Batch URL analysis completed');

      expect(completedLog).toBeDefined();
      expect(completedLog?.context?.total).toBe(2);
      expect(completedLog?.context?.successful).toBeDefined();
      expect(completedLog?.context?.failed).toBeDefined();
      expect(completedLog?.context?.durationMs).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single URL in batch', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('should handle maximum allowed URLs (100)', async () => {
      const maxUrls = Array(100)
        .fill(null)
        .map((_, i) => ({ url: `https://example.com/product/${i}` }));
      const event = createMockEvent({ urls: maxUrls });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(100);
      expect(body.total).toBe(100);
    });

    it('should handle URLs with no extractable IDs', async () => {
      const event = createMockEvent({
        urls: [{ url: 'https://example.com' }, { url: 'https://another-example.com' }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      body.results.forEach((resultItem) => {
        if (resultItem.success) {
          expect(resultItem.productIds).toEqual([]);
          expect(resultItem.count).toBe(0);
        }
      });
    });

    it('should handle URLs with special characters', async () => {
      const event = createMockEvent({
        urls: [
          { url: 'https://example.com/product?id=abc-123_def' },
          { url: 'https://example.com/product?id=xyz%20123' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle very long URLs in batch', async () => {
      const longPath = 'a'.repeat(500);
      const event = createMockEvent({
        urls: [
          { url: `https://example.com/${longPath}` },
          { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100' },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle duplicate URLs in batch', async () => {
      const duplicateUrl = 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100';
      const event = createMockEvent({
        urls: [{ url: duplicateUrl }, { url: duplicateUrl }, { url: duplicateUrl }],
      });
      const result = await createBatchUrlAnalysisHandler(event);
      const body = JSON.parse(result.body) as CreateBatchUrlAnalysisResponse;

      expect(result.statusCode).toBe(200);
      expect(body.results).toHaveLength(3);
      expect(body.total).toBe(3);
    });

    it('should handle mix of URLs with and without storeId', async () => {
      const event = createMockEvent({
        urls: [
          {
            url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n8tKB/CN8490-100',
            storeId: '12345',
          },
          { url: 'https://www.target.com/p/example-product/-/A-12345678' },
          {
            url: 'https://www.amazon.com/dp/B08N5WRWNW',
            storeId: '67890',
          },
        ],
      });
      const result = await createBatchUrlAnalysisHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });
});
