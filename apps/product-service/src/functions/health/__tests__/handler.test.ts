import type { APIGatewayProxyEvent } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { healthCheckHandler } from '../handler';
import { healthResponseSchema } from '../schema';
import type { HealthResponse } from '../types';

describe('Health Check Handler', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/health',
    headers: {},
    queryStringParameters: null,
    pathParameters: null,
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as never,
    resource: '',
    ...overrides,
  });

  describe('successful responses', () => {
    it('should return 200 status code', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should return healthy status', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.status).toBe('healthy');
    });

    it('should return service name', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.service).toBe('rr-product-service');
    });

    it('should return timestamp in ISO format', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(body.timestamp)).not.toThrow();
    });

    it('should return default version when SERVICE_VERSION not set', async () => {
      delete process.env.SERVICE_VERSION;
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.version).toBe('1.0.0');
    });

    it('should return custom version when SERVICE_VERSION is set', async () => {
      process.env.SERVICE_VERSION = '2.5.3';
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.version).toBe('2.5.3');
    });

    it('should return default environment when NODE_ENV not set', async () => {
      delete process.env.NODE_ENV;
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.environment).toBe('development');
    });

    it('should return production environment when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.environment).toBe('production');
    });

    it('should return test environment when NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body.environment).toBe('test');
    });
  });

  describe('response structure', () => {
    it('should return valid JSON body', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);

      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should match HealthResponse type structure', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body) as HealthResponse;

      expect(body.status).toBeDefined();
      expect(body.service).toBeDefined();
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBeDefined();
      expect(body.environment).toBeDefined();
    });

    it('should validate against healthResponseSchema', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      // Should not throw validation error
      expect(() => healthResponseSchema.parse(body)).not.toThrow();

      // Validate it returns the correct type
      const validated = healthResponseSchema.parse(body);
      expect(validated).toEqual(body);
    });

    it('should include all required fields', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('service');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('environment');
    });

    it('should only include expected fields', async () => {
      const event = createMockEvent();
      const result = healthCheckHandler(event);
      const body = JSON.parse(result.body);

      const keys = Object.keys(body);
      expect(keys).toHaveLength(5);
      expect(keys.sort()).toEqual(['environment', 'service', 'status', 'timestamp', 'version'].sort());
    });
  });

  describe('event handling', () => {
    it('should handle different HTTP methods', async () => {
      const event = createMockEvent({ httpMethod: 'POST' });
      const result = healthCheckHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle different paths', async () => {
      const event = createMockEvent({ path: '/some-other-path' });
      const result = healthCheckHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle events with headers', async () => {
      const event = createMockEvent({
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent',
        },
      });
      const result = healthCheckHandler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should handle events with query parameters', async () => {
      const event = createMockEvent({
        queryStringParameters: { test: 'value' },
      });
      const result = healthCheckHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('consistency', () => {
    it('should return consistent structure across multiple calls', async () => {
      const event = createMockEvent();

      const result1 = healthCheckHandler(event);
      const result2 = healthCheckHandler(event);

      const body1 = JSON.parse(result1.body);
      const body2 = JSON.parse(result2.body);

      expect(body1.status).toBe(body2.status);
      expect(body1.service).toBe(body2.service);
      expect(body1.version).toBe(body2.version);
      expect(body1.environment).toBe(body2.environment);
    });

    it('should update timestamp on each call', async () => {
      const event = createMockEvent();

      const result1 = healthCheckHandler(event);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = healthCheckHandler(event);

      const body1 = JSON.parse(result1.body);
      const body2 = JSON.parse(result2.body);

      expect(body1.timestamp).not.toBe(body2.timestamp);
    });
  });

  describe('logging', () => {
    it('should log debug and info messages', () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const event = createMockEvent();

      healthCheckHandler(event);

      // Should have logged debug and info messages
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);

      // Check debug log
      const debugLog = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(debugLog.level).toBe('debug');
      expect(debugLog.message).toBe('Health check requested');
      expect(debugLog.context.namespace).toBe('product-service.health');

      // Check info log
      const infoLog = JSON.parse(consoleLogSpy.mock.calls[1][0] as string);
      expect(infoLog.level).toBe('info');
      expect(infoLog.message).toBe('Health check successful');
      expect(infoLog.context.namespace).toBe('product-service.health');
      expect(infoLog.context.status).toBe('healthy');
      expect(infoLog.context.version).toBeDefined();
      expect(infoLog.context.environment).toBeDefined();
    });
  });
});
