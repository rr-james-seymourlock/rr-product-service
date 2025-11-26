import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertAsins } from '../converter.js';
import {
  ApiRequestError,
  ApiResponseError,
  ConfigurationError,
  InvalidInputError,
  ProductNotFoundError,
} from '../errors.js';
import type { AsinConverterConfig } from '../types.js';

// Mock config
const mockConfig: AsinConverterConfig = {
  host: 'https://api.synccentric.com',
  authKey: 'test-auth-key',
  timeout: 5000,
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('convertAsins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful conversion', () => {
    it('should convert ASINs to product IDs successfully', async () => {
      const mockResponse = {
        data: [
          {
            attributes: {
              upc: '012345678905',
              sku: 'SKU-123',
              mpn: 'MPN-456',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await convertAsins(['B08N5WRWNW'], mockConfig);

      expect(result).toEqual(['012345678905', 'SKU-123', 'MPN-456']);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search?identifier=B08N5WRWNW&type=asin&locale=US'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-auth-key',
          }),
        }),
      );
    });

    it('should filter out empty product IDs', async () => {
      const mockResponse = {
        data: [
          {
            attributes: {
              upc: '012345678905',
              sku: '',
              mpn: undefined,
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await convertAsins(['B08N5WRWNW'], mockConfig);

      expect(result).toEqual(['012345678905']);
    });

    it('should handle multiple ASINs in request', async () => {
      const mockResponse = {
        data: [
          {
            attributes: {
              upc: '012345678905',
              sku: 'SKU-123',
              mpn: 'MPN-456',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await convertAsins(['B08N5WRWNW', 'B07ZPKN6YR'], mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('identifier=B08N5WRWNW%2CB07ZPKN6YR'),
        expect.any(Object),
      );
    });

    it('should return empty array when no product data in response', async () => {
      const mockResponse = {
        data: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await convertAsins(['B08N5WRWNW'], mockConfig);

      expect(result).toEqual([]);
    });
  });

  describe('input validation', () => {
    it('should throw InvalidInputError for empty array', async () => {
      await expect(convertAsins([], mockConfig)).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError for array with empty strings', async () => {
      await expect(convertAsins([''], mockConfig)).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError for invalid input type', async () => {
      // @ts-expect-error Testing invalid input
      await expect(convertAsins('not-an-array', mockConfig)).rejects.toThrow(InvalidInputError);
    });
  });

  describe('configuration validation', () => {
    it('should throw ConfigurationError when host is missing', async () => {
      const invalidConfig = { ...mockConfig, host: '' };

      await expect(convertAsins(['B08N5WRWNW'], invalidConfig)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when authKey is missing', async () => {
      const invalidConfig = { ...mockConfig, authKey: '' };

      await expect(convertAsins(['B08N5WRWNW'], invalidConfig)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('API error handling', () => {
    it('should throw ApiRequestError when API returns non-200 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      await expect(convertAsins(['B08N5WRWNW'], mockConfig)).rejects.toThrow(ApiRequestError);
    });

    it('should throw ApiRequestError with status code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      });

      try {
        await convertAsins(['B08N5WRWNW'], mockConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).statusCode).toBe(404);
      }
    });

    it('should throw ProductNotFoundError when API returns product_not_found error', async () => {
      const mockResponse = {
        errors: [
          {
            id: 'product_not_found',
            title: 'Product not found',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await expect(convertAsins(['B08N5WRWNW'], mockConfig)).rejects.toThrow(ProductNotFoundError);
    });

    it('should throw ApiResponseError for other API errors', async () => {
      const mockResponse = {
        errors: [
          {
            id: 'invalid_request',
            title: 'Invalid request',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await expect(convertAsins(['B08N5WRWNW'], mockConfig)).rejects.toThrow(ApiResponseError);
    });

    it('should throw ApiResponseError when response structure is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          // Invalid structure - data array contains invalid product structure
          data: [
            {
              // Missing required 'attributes' field
              invalid: 'product',
            },
          ],
        }),
      });

      await expect(convertAsins(['B08N5WRWNW'], mockConfig)).rejects.toThrow(ApiResponseError);
    });
  });

  describe('timeout handling', () => {
    it('should throw ApiRequestError when request times out', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            }, 100);
          }),
      );

      const quickConfig = { ...mockConfig, timeout: 50 };

      await expect(convertAsins(['B08N5WRWNW'], quickConfig)).rejects.toThrow(ApiRequestError);
    });
  });

  describe('network error handling', () => {
    it('should throw ApiRequestError when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(convertAsins(['B08N5WRWNW'], mockConfig)).rejects.toThrow(ApiRequestError);
    });

    it('should include original error as cause', async () => {
      const originalError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(originalError);

      try {
        await convertAsins(['B08N5WRWNW'], mockConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).cause).toBe(originalError);
      }
    });
  });

  describe('default timeout', () => {
    it('should use default timeout when not specified', async () => {
      const mockResponse = {
        data: [
          {
            attributes: {
              upc: '012345678905',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const configWithoutTimeout = {
        host: mockConfig.host,
        authKey: mockConfig.authKey,
      };

      await convertAsins(['B08N5WRWNW'], configWithoutTimeout);

      // Verify the function completes successfully (default timeout is 10 seconds)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
