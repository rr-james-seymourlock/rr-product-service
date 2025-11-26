import { describe, expect, it } from 'vitest';
import {
  ApiRequestError,
  ApiResponseError,
  AsinConverterError,
  ConfigurationError,
  InvalidInputError,
  ProductNotFoundError,
} from '../errors.js';

describe('Error Classes', () => {
  describe('AsinConverterError', () => {
    it('should create error with correct name and message', () => {
      const error = new AsinConverterError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AsinConverterError);
      expect(error.name).toBe('AsinConverterError');
      expect(error.message).toBe('Test error');
    });
  });

  describe('InvalidInputError', () => {
    it('should create error with custom message', () => {
      const error = new InvalidInputError('Invalid ASINs provided');

      expect(error).toBeInstanceOf(AsinConverterError);
      expect(error).toBeInstanceOf(InvalidInputError);
      expect(error.name).toBe('InvalidInputError');
      expect(error.message).toBe('Invalid ASINs provided');
    });

    it('should use default message when none provided', () => {
      const error = new InvalidInputError();

      expect(error.message).toBe('Invalid input provided');
    });
  });

  describe('ApiRequestError', () => {
    it('should create error with message and status code', () => {
      const error = new ApiRequestError('Request failed', 500);

      expect(error).toBeInstanceOf(AsinConverterError);
      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error.name).toBe('ApiRequestError');
      expect(error.message).toBe('Request failed');
      expect(error.statusCode).toBe(500);
    });

    it('should create error with cause', () => {
      const cause = new Error('Network error');
      const error = new ApiRequestError('Request failed', 500, cause);

      expect(error.statusCode).toBe(500);
      expect(error.cause).toBe(cause);
    });

    it('should create error without status code and cause', () => {
      const error = new ApiRequestError('Request failed');

      expect(error.statusCode).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });
  });

  describe('ApiResponseError', () => {
    it('should create error with custom message', () => {
      const error = new ApiResponseError('Invalid response structure');

      expect(error).toBeInstanceOf(AsinConverterError);
      expect(error).toBeInstanceOf(ApiResponseError);
      expect(error.name).toBe('ApiResponseError');
      expect(error.message).toBe('Invalid response structure');
    });

    it('should use default message when none provided', () => {
      const error = new ApiResponseError();

      expect(error.message).toBe('Invalid API response');
    });
  });

  describe('ProductNotFoundError', () => {
    it('should create error with ASINs', () => {
      const asins = ['B08N5WRWNW', 'B07ZPKN6YR'];
      const error = new ProductNotFoundError(asins);

      expect(error).toBeInstanceOf(AsinConverterError);
      expect(error).toBeInstanceOf(ProductNotFoundError);
      expect(error.name).toBe('ProductNotFoundError');
      expect(error.message).toBe('Product not found for ASINs: B08N5WRWNW, B07ZPKN6YR');
      expect(error.asins).toEqual(asins);
    });

    it('should create error with single ASIN', () => {
      const asins = ['B08N5WRWNW'];
      const error = new ProductNotFoundError(asins);

      expect(error.message).toBe('Product not found for ASINs: B08N5WRWNW');
      expect(error.asins).toEqual(asins);
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with custom message', () => {
      const error = new ConfigurationError('Missing auth key');

      expect(error).toBeInstanceOf(AsinConverterError);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Missing auth key');
    });

    it('should use default message when none provided', () => {
      const error = new ConfigurationError();

      expect(error.message).toBe('Missing required configuration');
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper inheritance for all error types', () => {
      const errors = [
        new InvalidInputError(),
        new ApiRequestError('test'),
        new ApiResponseError(),
        new ProductNotFoundError(['test']),
        new ConfigurationError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AsinConverterError);
      });
    });
  });
});
