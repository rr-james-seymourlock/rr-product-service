import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { patternExtractor, extractIdsFromUrlComponents } from '../extractIdsFromUrlComponents';
import * as storeConfigModule from '@/storeConfigs';
import { config } from '../extractIdsFromUrlComponents.config';

describe('Error handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('patternExtractor error handling', () => {
    it('should throw ZodError for non-RegExp pattern', () => {
      // Zod validation now catches this before development mode check
      expect(() =>
        patternExtractor({
          source: 'test123',
          pattern: 'not a regex' as any,
        }),
      ).toThrow('Pattern must be a RegExp object');
    });

    it('should validate pattern has global flag in development mode', () => {
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      const nonGlobalPattern = /test/; // Missing 'g' flag

      const result = patternExtractor({
        source: 'test123',
        pattern: nonGlobalPattern,
      });

      expect(result).toEqual(new Set());
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('must have global flag'));

      process.env['NODE_ENV'] = originalNodeEnv;
    });

    it('should warn when MAX_RESULTS is reached in development mode', () => {
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      // Create a source with many matches to exceed MAX_RESULTS
      const manyMatches = Array.from(
        { length: config.MAX_RESULTS + 5 },
        (_, i) => `test${String(i).padStart(6, '0')}`,
      ).join(' ');

      const pattern = /test(\d{6})/g;

      const result = patternExtractor({
        source: manyMatches,
        pattern,
      });

      expect(result.size).toBe(config.MAX_RESULTS);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Reached maximum results limit of ${config.MAX_RESULTS}`),
      );

      process.env['NODE_ENV'] = originalNodeEnv;
    });

    it('should handle regex execution errors gracefully', () => {
      // Create a pattern that will throw during execution
      const malformedPattern = /test/g;
      const originalExec = malformedPattern.exec;

      // Mock exec to throw an error
      malformedPattern.exec = function () {
        throw new Error('Regex execution failed');
      };

      const result = patternExtractor({
        source: 'test123',
        pattern: malformedPattern,
      });

      expect(result).toEqual(new Set());
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error extracting patterns from source'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Regex execution failed'),
      );

      // Restore original exec
      malformedPattern.exec = originalExec;
    });

    it('should handle unknown errors in pattern extraction', () => {
      const malformedPattern = /test/g;

      // Mock exec to throw a non-Error object
      malformedPattern.exec = function () {
        throw 'String error';
      };

      const result = patternExtractor({
        source: 'test123',
        pattern: malformedPattern,
      });

      expect(result).toEqual(new Set());
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error extracting patterns from source'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown error'));
    });

    it('should timeout when pattern extraction takes too long', () => {
      const pattern = /test(\d+)/g;

      // Mock Date.now to simulate timeout
      const originalDateNow = Date.now;
      let callCount = 0;
      const startTime = originalDateNow();

      vi.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        // First call is the startTime initialization
        // Second call is the first timeout check
        // Return time that exceeds TIMEOUT_MS on the second check
        if (callCount === 1) {
          return startTime;
        }
        return startTime + config.TIMEOUT_MS + 10; // Exceed timeout
      });

      const result = patternExtractor({
        source: 'test123',
        pattern,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Pattern extraction timed out'),
      );

      vi.restoreAllMocks();
    });
  });

  describe('extractIdsFromUrlComponents error handling', () => {
    it('should handle errors in main extraction gracefully', () => {
      // Mock getStoreConfig to throw an error
      vi.spyOn(storeConfigModule, 'getStoreConfig').mockImplementation(() => {
        throw new Error('Config retrieval failed');
      });

      const urlComponents = {
        href: 'https://example.com/product/p123456789',
        encodedHref: 'https%3A%2F%2Fexample.com%2Fproduct%2Fp123456789',
        hostname: 'example.com',
        pathname: '/product/p123456789',
        search: '',
        domain: 'example.com',
        key: 'abc123_defg45678', // 16 characters
        original: 'https://example.com/product/p123456789',
      };

      const result = extractIdsFromUrlComponents({ urlComponents });

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing URL'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Config retrieval failed'),
      );

      vi.restoreAllMocks();
    });

    it('should handle unknown errors in extraction', () => {
      // Mock getStoreConfig to throw a non-Error object
      vi.spyOn(storeConfigModule, 'getStoreConfig').mockImplementation(() => {
        throw 'String error in config';
      });

      const urlComponents = {
        href: 'https://example.com/product/p123456789',
        encodedHref: 'https%3A%2F%2Fexample.com%2Fproduct%2Fp123456789',
        hostname: 'example.com',
        pathname: '/product/p123456789',
        search: '',
        domain: 'example.com',
        key: 'abc123_defg45678', // 16 characters
        original: 'https://example.com/product/p123456789',
      };

      const result = extractIdsFromUrlComponents({ urlComponents });

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing URL'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown error'));

      vi.restoreAllMocks();
    });
  });
});
