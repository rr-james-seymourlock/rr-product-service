import { describe, expect, it } from 'vitest';
import {
  ConvertAsinsInputSchema,
  ConvertAsinsOutputSchema,
  SynccentricErrorSchema,
  SynccentricProductAttributesSchema,
  SynccentricProductDataSchema,
  SynccentricResponseSchema,
} from '../types.js';

describe('Type Schemas', () => {
  describe('SynccentricProductAttributesSchema', () => {
    it('should validate valid product attributes', () => {
      const valid = {
        upc: '012345678905',
        sku: 'SKU-123',
        mpn: 'MPN-456',
      };

      const result = SynccentricProductAttributesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const valid = {
        upc: '012345678905',
      };

      const result = SynccentricProductAttributesSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = SynccentricProductAttributesSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('SynccentricProductDataSchema', () => {
    it('should validate product data with attributes', () => {
      const valid = {
        attributes: {
          upc: '012345678905',
          sku: 'SKU-123',
        },
      };

      const result = SynccentricProductDataSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject data without attributes', () => {
      const invalid = {};

      const result = SynccentricProductDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('SynccentricErrorSchema', () => {
    it('should validate error with id and optional fields', () => {
      const valid = {
        id: 'product_not_found',
        title: 'Product not found',
        detail: 'No product matching the given ASIN',
      };

      const result = SynccentricErrorSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate error with only id', () => {
      const valid = {
        id: 'product_not_found',
      };

      const result = SynccentricErrorSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject error without id', () => {
      const invalid = {
        title: 'Error',
      };

      const result = SynccentricErrorSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('SynccentricResponseSchema', () => {
    it('should validate response with data', () => {
      const valid = {
        data: [
          {
            attributes: {
              upc: '012345678905',
            },
          },
        ],
      };

      const result = SynccentricResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate response with errors', () => {
      const valid = {
        errors: [
          {
            id: 'product_not_found',
            title: 'Product not found',
          },
        ],
      };

      const result = SynccentricResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate response with both data and errors', () => {
      const valid = {
        data: [],
        errors: [
          {
            id: 'warning',
          },
        ],
      };

      const result = SynccentricResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate empty response', () => {
      const valid = {};

      const result = SynccentricResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid data structure', () => {
      const invalid = {
        data: [
          {
            // Missing attributes
          },
        ],
      };

      const result = SynccentricResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConvertAsinsInputSchema', () => {
    it('should validate array of ASINs', () => {
      const valid = ['B08N5WRWNW', 'B07ZPKN6YR'];

      const result = ConvertAsinsInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate single ASIN', () => {
      const valid = ['B08N5WRWNW'];

      const result = ConvertAsinsInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const invalid: string[] = [];

      const result = ConvertAsinsInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject array with empty strings', () => {
      const invalid = [''];

      const result = ConvertAsinsInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-array input', () => {
      const invalid = 'B08N5WRWNW';

      const result = ConvertAsinsInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConvertAsinsOutputSchema', () => {
    it('should validate object with product identifiers', () => {
      const valid = { upc: '012345678905', sku: 'SKU-123', mpn: 'MPN-456' };

      const result = ConvertAsinsOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate empty object', () => {
      const valid = {};

      const result = ConvertAsinsOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate object with partial identifiers', () => {
      const valid = { upc: '012345678905' };

      const result = ConvertAsinsOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject non-object input', () => {
      const invalid = 'SKU-123';

      const result = ConvertAsinsOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject array input', () => {
      const invalid = ['012345678905', 'SKU-123'];

      const result = ConvertAsinsOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
