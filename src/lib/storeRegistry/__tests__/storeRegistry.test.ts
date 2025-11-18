import { describe, it, expect } from 'vitest';
import {
  getStoreConfig,
  STORE_ID_CONFIG,
  STORE_NAME_CONFIG,
  COMPILED_PATTERNS,
} from '../storeRegistry';
import type { StoreConfigInterface } from '../storeRegistry.types';
import { storeConfigs } from '../storeRegistry.config';

describe('storeRegistry', () => {
  describe('getStoreConfig', () => {
    describe('ID lookup', () => {
      it('should retrieve store config by primary ID', () => {
        const config = getStoreConfig({ id: '5246' });
        expect(config).toBeDefined();
        expect(config?.id).toBe('5246');
        expect(config?.domain).toBe('target.com');
      });

      it('should retrieve store config by alias ID', () => {
        // Find a store with aliases
        const storeWithAlias = storeConfigs.find((s) => s.aliases && s.aliases.length > 0);
        if (storeWithAlias?.aliases && storeWithAlias.aliases[0]) {
          const aliasId = storeWithAlias.aliases[0].id;
          const config = getStoreConfig({ id: aliasId });
          expect(config).toBeDefined();
          expect(config?.id).toBe(storeWithAlias.id);
        }
      });

      it('should return undefined for non-existent ID', () => {
        const config = getStoreConfig({ id: 'non-existent-id-12345' });
        expect(config).toBeUndefined();
      });

      it('should return undefined for empty ID', () => {
        const config = getStoreConfig({ id: '' });
        expect(config).toBeUndefined();
      });
    });

    describe('domain lookup', () => {
      it('should retrieve store config by primary domain', () => {
        const config = getStoreConfig({ domain: 'nike.com' });
        expect(config).toBeDefined();
        expect(config?.id).toBe('9528');
        expect(config?.domain).toBe('nike.com');
      });

      it('should retrieve store config by alias domain', () => {
        // Find a store with aliases
        const storeWithAlias = storeConfigs.find((s) => s.aliases && s.aliases.length > 0);
        if (storeWithAlias?.aliases && storeWithAlias.aliases[0]) {
          const aliasDomain = storeWithAlias.aliases[0].domain;
          const config = getStoreConfig({ domain: aliasDomain });
          expect(config).toBeDefined();
          expect(config?.id).toBe(storeWithAlias.id);
        }
      });

      it('should return undefined for non-existent domain', () => {
        const config = getStoreConfig({ domain: 'non-existent-domain.com' });
        expect(config).toBeUndefined();
      });

      it('should return undefined for empty domain', () => {
        const config = getStoreConfig({ domain: '' });
        expect(config).toBeUndefined();
      });
    });

    describe('priority and edge cases', () => {
      it('should prioritize ID lookup over domain when both provided', () => {
        const config = getStoreConfig({ id: '5246', domain: 'nike.com' });
        // Should use ID (target) not domain (nike)
        expect(config?.domain).toBe('target.com');
      });

      it('should return undefined when neither ID nor domain provided', () => {
        const config = getStoreConfig({});
        expect(config).toBeUndefined();
      });
    });
  });

  describe('STORE_ID_CONFIG', () => {
    it('should be a ReadonlyMap', () => {
      expect(STORE_ID_CONFIG).toBeInstanceOf(Map);
    });

    it('should contain all primary store IDs', () => {
      // Build a map of the last occurrence of each ID (matching Map behavior where last wins)
      const lastOccurrenceMap = new Map<string, StoreConfigInterface>();
      storeConfigs.forEach((store) => {
        lastOccurrenceMap.set(store.id, store);
      });

      // Verify all unique IDs are in STORE_ID_CONFIG
      lastOccurrenceMap.forEach((store, id) => {
        expect(STORE_ID_CONFIG.has(id)).toBe(true);
        const config = STORE_ID_CONFIG.get(id);
        expect(config).toBe(store);
      });
    });

    it('should contain all alias IDs', () => {
      storeConfigs.forEach((store) => {
        if (store.aliases) {
          store.aliases.forEach((alias) => {
            expect(STORE_ID_CONFIG.has(alias.id)).toBe(true);
            const config = STORE_ID_CONFIG.get(alias.id);
            expect(config).toBe(store); // Alias points to main store config
          });
        }
      });
    });

    it('should have correct size (primary + aliases)', () => {
      // Calculate unique IDs (accounting for duplicates where last wins)
      const uniqueIds = new Set<string>();
      storeConfigs.forEach((store) => {
        uniqueIds.add(store.id);
        store.aliases?.forEach((alias) => {
          uniqueIds.add(alias.id);
        });
      });
      expect(STORE_ID_CONFIG.size).toBe(uniqueIds.size);
    });
  });

  describe('STORE_NAME_CONFIG', () => {
    it('should be a ReadonlyMap', () => {
      expect(STORE_NAME_CONFIG).toBeInstanceOf(Map);
    });

    it('should contain all primary domains', () => {
      storeConfigs.forEach((store) => {
        expect(STORE_NAME_CONFIG.has(store.domain)).toBe(true);
        const storeId = STORE_NAME_CONFIG.get(store.domain);
        expect(storeId).toBe(store.id);
      });
    });

    it('should contain all alias domains', () => {
      storeConfigs.forEach((store) => {
        if (store.aliases) {
          store.aliases.forEach((alias) => {
            expect(STORE_NAME_CONFIG.has(alias.domain)).toBe(true);
            const storeId = STORE_NAME_CONFIG.get(alias.domain);
            expect(storeId).toBe(alias.id);
          });
        }
      });
    });

    it('should have correct size (primary + alias domains)', () => {
      const expectedSize = storeConfigs.reduce((count, store) => {
        return count + 1 + (store.aliases?.length ?? 0);
      }, 0);
      expect(STORE_NAME_CONFIG.size).toBe(expectedSize);
    });

    it('should map domains to correct store IDs', () => {
      expect(STORE_NAME_CONFIG.get('target.com')).toBe('5246');
      expect(STORE_NAME_CONFIG.get('nike.com')).toBe('9528');
    });
  });

  describe('COMPILED_PATTERNS', () => {
    it('should be a ReadonlyMap', () => {
      expect(COMPILED_PATTERNS).toBeInstanceOf(Map);
    });

    it('should only contain stores with pathnamePatterns', () => {
      // Build map of last occurrence for stores with patterns (matching Map behavior)
      const lastOccurrenceWithPatterns = new Map<string, StoreConfigInterface>();
      storeConfigs
        .filter((s) => s.pathnamePatterns !== undefined)
        .forEach((store) => {
          lastOccurrenceWithPatterns.set(store.id, store);
        });

      expect(COMPILED_PATTERNS.size).toBe(lastOccurrenceWithPatterns.size);

      lastOccurrenceWithPatterns.forEach((store, id) => {
        expect(COMPILED_PATTERNS.has(id)).toBe(true);
        const patterns = COMPILED_PATTERNS.get(id);
        expect(patterns).toBe(store.pathnamePatterns);
      });
    });

    it('should not contain stores without pathnamePatterns', () => {
      const storesWithoutPatterns = storeConfigs.filter((s) => s.pathnamePatterns === undefined);
      storesWithoutPatterns.forEach((store) => {
        expect(COMPILED_PATTERNS.has(store.id)).toBe(false);
      });
    });

    it('should contain valid RegExp patterns', () => {
      COMPILED_PATTERNS.forEach((patterns) => {
        expect(Array.isArray(patterns)).toBe(true);
        patterns.forEach((pattern) => {
          expect(pattern).toBeInstanceOf(RegExp);
        });
      });
    });
  });

  describe('StoreConfigInterface structure', () => {
    it('should have required fields', () => {
      storeConfigs.forEach((store) => {
        expect(store.id).toBeDefined();
        expect(typeof store.id).toBe('string');
        expect(store.id.length).toBeGreaterThan(0);

        expect(store.domain).toBeDefined();
        expect(typeof store.domain).toBe('string');
        expect(store.domain.length).toBeGreaterThan(0);
      });
    });

    it('should have valid optional fields when present', () => {
      storeConfigs.forEach((store) => {
        if (store.aliases) {
          expect(Array.isArray(store.aliases)).toBe(true);
          store.aliases.forEach((alias) => {
            expect(alias.id).toBeDefined();
            expect(typeof alias.id).toBe('string');
            expect(alias.domain).toBeDefined();
            expect(typeof alias.domain).toBe('string');
          });
        }

        if (store.patternFormats) {
          expect(Array.isArray(store.patternFormats)).toBe(true);
          store.patternFormats.forEach((format) => {
            expect(typeof format).toBe('string');
          });
        }

        if (store.pathnamePatterns) {
          expect(Array.isArray(store.pathnamePatterns)).toBe(true);
          store.pathnamePatterns.forEach((pattern) => {
            expect(pattern).toBeInstanceOf(RegExp);
          });
        }

        if (store.searchPatterns) {
          expect(Array.isArray(store.searchPatterns)).toBe(true);
          store.searchPatterns.forEach((pattern) => {
            expect(pattern).toBeInstanceOf(RegExp);
          });
        }

        if (store.transformId) {
          expect(typeof store.transformId).toBe('function');
        }
      });
    });
  });

  describe('specific store configurations', () => {
    it('should have Target configuration', () => {
      const config = getStoreConfig({ id: '5246' });
      expect(config).toBeDefined();
      expect(config?.domain).toBe('target.com');
      expect(config?.pathnamePatterns).toBeDefined();
      expect(config?.pathnamePatterns?.length).toBeGreaterThan(0);
    });

    it('should have Nike configuration', () => {
      const config = getStoreConfig({ id: '9528' });
      expect(config).toBeDefined();
      expect(config?.domain).toBe('nike.com');
      expect(config?.pathnamePatterns).toBeDefined();
      expect(config?.pathnamePatterns?.length).toBeGreaterThan(0);
    });
  });

  describe('performance characteristics', () => {
    it('should perform ID lookup in constant time', () => {
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        getStoreConfig({ id: '5246' });
      }
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / 1000;

      // Should be very fast (< 0.01ms per lookup on average)
      expect(avgTime).toBeLessThan(0.01);
    });

    it('should perform domain lookup efficiently', () => {
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        getStoreConfig({ domain: 'target.com' });
      }
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / 1000;

      // Should be fast (< 0.02ms per lookup on average, slightly slower than ID due to double Map access)
      expect(avgTime).toBeLessThan(0.02);
    });
  });

  describe('immutability', () => {
    it('should export readonly Maps', () => {
      // Maps themselves are not frozen in TypeScript, but typed as readonly
      // We can verify they work as expected
      expect(STORE_ID_CONFIG).toBeInstanceOf(Map);
      expect(STORE_NAME_CONFIG).toBeInstanceOf(Map);
      expect(COMPILED_PATTERNS).toBeInstanceOf(Map);
    });

    it('should have readonly configuration objects', () => {
      const config = getStoreConfig({ id: '5246' }) as StoreConfigInterface;

      // TypeScript enforces readonly at compile time
      // Runtime verification that the object exists and has expected properties
      expect(config.id).toBe('5246');
      expect(config.domain).toBe('target.com');
    });
  });
});
