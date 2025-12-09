import { describe, expect, it } from 'vitest';

import { coerceStoreId } from '../store-id';

describe('coerceStoreId', () => {
  describe('number inputs', () => {
    it('should convert positive number to string', () => {
      expect(coerceStoreId(8333)).toBe('8333');
    });

    it('should convert zero to string', () => {
      expect(coerceStoreId(0)).toBe('0');
    });

    it('should convert negative number to string', () => {
      expect(coerceStoreId(-123)).toBe('-123');
    });

    it('should convert large number to string', () => {
      expect(coerceStoreId(9999999999)).toBe('9999999999');
    });

    it('should convert floating point number to string', () => {
      expect(coerceStoreId(123.456)).toBe('123.456');
    });

    it('should convert NaN to string "NaN"', () => {
      // Note: NaN becomes "NaN" string - callers should validate if needed
      expect(coerceStoreId(NaN)).toBe('NaN');
    });

    it('should convert Infinity to string', () => {
      expect(coerceStoreId(Infinity)).toBe('Infinity');
    });
  });

  describe('string inputs', () => {
    it('should preserve numeric string', () => {
      expect(coerceStoreId('8333')).toBe('8333');
    });

    it('should preserve non-numeric string', () => {
      expect(coerceStoreId('uk-87262')).toBe('uk-87262');
    });

    it('should trim whitespace from string', () => {
      expect(coerceStoreId('  8333  ')).toBe('8333');
    });

    it('should return undefined for empty string', () => {
      expect(coerceStoreId('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      expect(coerceStoreId('   ')).toBeUndefined();
    });

    it('should return undefined for tab-only string', () => {
      expect(coerceStoreId('\t\t')).toBeUndefined();
    });

    it('should return undefined for newline-only string', () => {
      expect(coerceStoreId('\n\n')).toBeUndefined();
    });

    it('should preserve string with special characters', () => {
      expect(coerceStoreId('store-123_abc')).toBe('store-123_abc');
    });
  });

  describe('null and undefined inputs', () => {
    it('should return undefined for undefined input', () => {
      expect(coerceStoreId(undefined)).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      expect(coerceStoreId(null)).toBeUndefined();
    });
  });
});
