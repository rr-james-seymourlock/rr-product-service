import { describe, it, expect } from 'vitest';
import { createUrlKey } from '../parseUrlComponents.js';

describe('createUrlKey', () => {
  it('should create consistent hash keys for the same input', () => {
    const input = 'example.com/path?query=1';
    const result1 = createUrlKey(input);
    const result2 = createUrlKey(input);

    expect(result1).toBe(result2);
  });

  it('should create different hash keys for different inputs', () => {
    const result1 = createUrlKey('example.com/path1');
    const result2 = createUrlKey('example.com/path2');

    expect(result1).not.toBe(result2);
  });

  it('should return a string of exactly 16 characters', () => {
    const result = createUrlKey('example.com/path');

    expect(result).toHaveLength(16);
  });

  it('should only contain alphanumeric characters, underscores, and hyphens', () => {
    const result = createUrlKey('example.com/path?query=1#fragment');

    expect(result).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('should throw an error for invalid inputs', () => {
    expect(() => createUrlKey('')).not.toThrow();
    expect(() => createUrlKey(null as unknown as string)).toThrow();
  });
});