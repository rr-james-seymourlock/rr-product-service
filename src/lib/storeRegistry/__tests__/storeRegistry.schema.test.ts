import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  storeAliasSchema,
  storeConfigSchema,
  storeIdentifierSchema,
  storeConfigsSchema,
} from '../storeRegistry.schema';

describe('storeRegistry schemas', () => {
  describe('storeAliasSchema', () => {
    it('should validate valid alias', () => {
      const validAlias = {
        id: 'test-alias-123',
        domain: 'example.com',
      };

      expect(() => storeAliasSchema.parse(validAlias)).not.toThrow();
      const result = storeAliasSchema.parse(validAlias);
      expect(result).toEqual(validAlias);
    });

    it('should reject alias with empty ID', () => {
      const invalidAlias = {
        id: '',
        domain: 'example.com',
      };

      expect(() => storeAliasSchema.parse(invalidAlias)).toThrow(ZodError);
      expect(() => storeAliasSchema.parse(invalidAlias)).toThrow('Alias ID cannot be empty');
    });

    it('should reject alias with empty domain', () => {
      const invalidAlias = {
        id: 'test-123',
        domain: '',
      };

      expect(() => storeAliasSchema.parse(invalidAlias)).toThrow(ZodError);
      expect(() => storeAliasSchema.parse(invalidAlias)).toThrow('Alias domain cannot be empty');
    });

    it('should reject alias with missing ID', () => {
      const invalidAlias = {
        domain: 'example.com',
      };

      expect(() => storeAliasSchema.parse(invalidAlias)).toThrow(ZodError);
    });

    it('should reject alias with missing domain', () => {
      const invalidAlias = {
        id: 'test-123',
      };

      expect(() => storeAliasSchema.parse(invalidAlias)).toThrow(ZodError);
    });
  });

  describe('storeConfigSchema', () => {
    it('should validate minimal valid store config', () => {
      const validConfig = {
        id: '5246',
        domain: 'target.com',
      };

      expect(() => storeConfigSchema.parse(validConfig)).not.toThrow();
      const result = storeConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should validate store config with all optional fields', () => {
      const validConfig = {
        id: '9528',
        domain: 'nike.com',
        aliases: [{ id: '9528-uk', domain: 'nike.co.uk' }],
        patternFormats: ['ABC-123', 'XYZ-456'],
        pathnamePatterns: [/test/gi, /pattern/g],
        searchPatterns: [/\?id=(\w+)/g],
        transformId: (id: string) => id.toUpperCase(),
      };

      expect(() => storeConfigSchema.parse(validConfig)).not.toThrow();
      const result = storeConfigSchema.parse(validConfig);
      expect(result.id).toBe('9528');
      expect(result.domain).toBe('nike.com');
      expect(result.aliases).toHaveLength(1);
      expect(result.patternFormats).toHaveLength(2);
      expect(result.pathnamePatterns).toHaveLength(2);
      expect(result.searchPatterns).toHaveLength(1);
      expect(typeof result.transformId).toBe('function');
    });

    it('should reject config with empty ID', () => {
      const invalidConfig = {
        id: '',
        domain: 'example.com',
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow('Store ID cannot be empty');
    });

    it('should reject config with empty domain', () => {
      const invalidConfig = {
        id: 'test-123',
        domain: '',
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow('Store domain cannot be empty');
    });

    it('should reject config with missing ID', () => {
      const invalidConfig = {
        domain: 'example.com',
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject config with missing domain', () => {
      const invalidConfig = {
        id: 'test-123',
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject config with invalid aliases', () => {
      const invalidConfig = {
        id: 'test-123',
        domain: 'example.com',
        aliases: [{ id: '', domain: 'test.com' }],
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject config with non-RegExp pathnamePatterns', () => {
      const invalidConfig = {
        id: 'test-123',
        domain: 'example.com',
        pathnamePatterns: ['not-a-regex'],
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject config with non-RegExp searchPatterns', () => {
      const invalidConfig = {
        id: 'test-123',
        domain: 'example.com',
        searchPatterns: ['not-a-regex'],
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject config with non-function transformId', () => {
      const invalidConfig = {
        id: 'test-123',
        domain: 'example.com',
        transformId: 'not-a-function',
      };

      expect(() => storeConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });
  });

  describe('storeIdentifierSchema', () => {
    it('should validate identifier with ID only', () => {
      const validIdentifier = { id: '5246' };

      expect(() => storeIdentifierSchema.parse(validIdentifier)).not.toThrow();
      const result = storeIdentifierSchema.parse(validIdentifier);
      expect(result).toEqual(validIdentifier);
    });

    it('should validate identifier with domain only', () => {
      const validIdentifier = { domain: 'target.com' };

      expect(() => storeIdentifierSchema.parse(validIdentifier)).not.toThrow();
      const result = storeIdentifierSchema.parse(validIdentifier);
      expect(result).toEqual(validIdentifier);
    });

    it('should validate identifier with both ID and domain', () => {
      const validIdentifier = { id: '5246', domain: 'target.com' };

      expect(() => storeIdentifierSchema.parse(validIdentifier)).not.toThrow();
      const result = storeIdentifierSchema.parse(validIdentifier);
      expect(result).toEqual(validIdentifier);
    });

    it('should reject identifier with neither ID nor domain', () => {
      const invalidIdentifier = {};

      expect(() => storeIdentifierSchema.parse(invalidIdentifier)).toThrow(ZodError);
      expect(() => storeIdentifierSchema.parse(invalidIdentifier)).toThrow(
        'Either domain or id must be provided',
      );
    });

    it('should reject identifier with empty ID', () => {
      const invalidIdentifier = { id: '' };

      expect(() => storeIdentifierSchema.parse(invalidIdentifier)).toThrow(ZodError);
    });

    it('should reject identifier with empty domain', () => {
      const invalidIdentifier = { domain: '' };

      expect(() => storeIdentifierSchema.parse(invalidIdentifier)).toThrow(ZodError);
    });

    it('should reject identifier with both empty', () => {
      const invalidIdentifier = { id: '', domain: '' };

      expect(() => storeIdentifierSchema.parse(invalidIdentifier)).toThrow(ZodError);
    });
  });

  describe('storeConfigsSchema', () => {
    it('should validate array of valid store configs', () => {
      const validConfigs = [
        { id: '5246', domain: 'target.com' },
        { id: '9528', domain: 'nike.com' },
      ];

      expect(() => storeConfigsSchema.parse(validConfigs)).not.toThrow();
      const result = storeConfigsSchema.parse(validConfigs);
      expect(result).toHaveLength(2);
    });

    it('should validate empty array', () => {
      const emptyConfigs: unknown[] = [];

      expect(() => storeConfigsSchema.parse(emptyConfigs)).not.toThrow();
      const result = storeConfigsSchema.parse(emptyConfigs);
      expect(result).toHaveLength(0);
    });

    it('should reject array with invalid config', () => {
      const invalidConfigs = [
        { id: '5246', domain: 'target.com' },
        { id: '', domain: 'nike.com' }, // Invalid: empty ID
      ];

      expect(() => storeConfigsSchema.parse(invalidConfigs)).toThrow(ZodError);
    });

    it('should reject non-array input', () => {
      const invalidInput = { id: '5246', domain: 'target.com' };

      expect(() => storeConfigsSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('type inference', () => {
    it('should correctly infer StoreAlias type', () => {
      const alias = storeAliasSchema.parse({
        id: 'test-123',
        domain: 'example.com',
      });

      // TypeScript should infer correct types
      const _id: string = alias.id;
      const _domain: string = alias.domain;

      expect(_id).toBe('test-123');
      expect(_domain).toBe('example.com');
    });

    it('should correctly infer StoreConfig type', () => {
      const config = storeConfigSchema.parse({
        id: '5246',
        domain: 'target.com',
        pathnamePatterns: [/test/g],
      });

      // TypeScript should infer correct types
      const _id: string = config.id;
      const _domain: string = config.domain;
      const _patterns: RegExp[] | undefined = config.pathnamePatterns;

      expect(_id).toBe('5246');
      expect(_domain).toBe('target.com');
      expect(_patterns).toHaveLength(1);
    });

    it('should correctly infer StoreIdentifier type', () => {
      const identifier = storeIdentifierSchema.parse({
        id: '5246',
        domain: 'target.com',
      });

      // TypeScript should infer correct optional types
      const _id: string | undefined = identifier.id;
      const _domain: string | undefined = identifier.domain;

      expect(_id).toBe('5246');
      expect(_domain).toBe('target.com');
    });
  });
});
