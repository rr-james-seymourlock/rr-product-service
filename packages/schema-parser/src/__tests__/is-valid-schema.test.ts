import { describe, expect, it } from 'vitest';

import { isValidProductSchema } from '../is-valid-schema';

const validProduct = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Test Product',
};

const validProductWithArrayType = {
  '@context': 'https://schema.org',
  '@type': ['Product', 'Thing'],
  name: 'Test Product',
};

const missingContext = {
  '@type': 'Product',
  name: 'Test Product',
};

const missingType = {
  '@context': 'https://schema.org',
  name: 'Test Product',
};

const missingName = {
  '@context': 'https://schema.org',
  '@type': 'Product',
};

describe('isValidProductSchema', () => {
  it('should return true for a valid product schema', () => {
    expect(isValidProductSchema(validProduct)).toBe(true);
  });

  it('should return true for a valid product schema with @type as array', () => {
    expect(isValidProductSchema(validProductWithArrayType)).toBe(true);
  });

  it('should throw for missing @context', () => {
    expect(() => isValidProductSchema(missingContext)).toThrow(/Missing or invalid @context/);
  });

  it('should throw for missing @type', () => {
    expect(() => isValidProductSchema(missingType)).toThrow(/Missing or invalid @type/);
  });

  it('should throw for missing name', () => {
    expect(() => isValidProductSchema(missingName)).toThrow(/Missing or invalid name/);
  });

  it('should throw for completely invalid input', () => {
    expect(() => isValidProductSchema({})).toThrow(/Missing or invalid @context/);
  });
});
