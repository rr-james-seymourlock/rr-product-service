import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearCache,
  configure,
  getAllCatalogStoreIds,
  getAllCatalogStores,
  getCacheStatus,
  getCatalogStoreName,
  isCatalogStoreEnabled,
} from '../client';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Sample API response
const mockApiResponse = {
  '@rows': '5',
  '@total': '5',
  store: [
    { id: 5246, name: 'Target' },
    { id: 3866, name: "Lands' End" },
    { id: 9376, name: 'Walmart' },
    { id: 16829, name: 'Best Buy' },
    { id: 2946, name: "Macy's" },
  ],
};

describe('CBSP Client', () => {
  beforeEach(() => {
    // Reset cache and config before each test
    clearCache();
    configure({});
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllCatalogStoreIds', () => {
    it('should fetch and return sorted store IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const storeIds = await getAllCatalogStoreIds();

      expect(storeIds).toEqual([2946, 3866, 5246, 9376, 16829]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cbsp/partner/1/store/list.json'),
      );
    });

    it('should cache results and not re-fetch within TTL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const firstCall = await getAllCatalogStoreIds();
      const secondCall = await getAllCatalogStoreIds();

      expect(firstCall).toEqual(secondCall);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when option is set', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await getAllCatalogStoreIds();
      await getAllCatalogStoreIds({ forceRefresh: true });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(getAllCatalogStoreIds()).rejects.toThrow('CBSP API error: 500');
    });
  });

  describe('isCatalogStoreEnabled', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    it('should return true for enabled store ID (number)', async () => {
      const result = await isCatalogStoreEnabled(5246);
      expect(result).toBe(true);
    });

    it('should return true for enabled store ID (string)', async () => {
      const result = await isCatalogStoreEnabled('5246');
      expect(result).toBe(true);
    });

    it('should return false for non-enabled store ID', async () => {
      const result = await isCatalogStoreEnabled(99999);
      expect(result).toBe(false);
    });

    it('should return false for invalid store ID', async () => {
      const result = await isCatalogStoreEnabled('invalid');
      expect(result).toBe(false);
    });

    it('should use cached data for subsequent calls', async () => {
      await isCatalogStoreEnabled(5246);
      await isCatalogStoreEnabled(3866);
      await isCatalogStoreEnabled(99999);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCatalogStoreName', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    it('should return store name for valid store ID (number)', async () => {
      const name = await getCatalogStoreName(5246);
      expect(name).toBe('Target');
    });

    it('should return store name for valid store ID (string)', async () => {
      const name = await getCatalogStoreName('3866');
      expect(name).toBe("Lands' End");
    });

    it('should return undefined for non-existent store ID', async () => {
      const name = await getCatalogStoreName(99999);
      expect(name).toBeUndefined();
    });

    it('should return undefined for invalid store ID', async () => {
      const name = await getCatalogStoreName('invalid');
      expect(name).toBeUndefined();
    });
  });

  describe('getAllCatalogStores', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
    });

    it('should return sorted stores with IDs and names', async () => {
      const stores = await getAllCatalogStores();

      expect(stores).toEqual([
        { id: 2946, name: "Macy's" },
        { id: 3866, name: "Lands' End" },
        { id: 5246, name: 'Target' },
        { id: 9376, name: 'Walmart' },
        { id: 16829, name: 'Best Buy' },
      ]);
    });

    it('should use cached data', async () => {
      await getAllCatalogStores();
      await getAllCatalogStores();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('configure', () => {
    it('should use custom base URL', async () => {
      configure({ baseUrl: 'https://custom.example.com' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await getAllCatalogStoreIds();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://custom.example.com'));
    });
  });

  describe('getCacheStatus', () => {
    it('should return not cached when cache is empty', () => {
      const status = getCacheStatus();

      expect(status.isCached).toBe(false);
      expect(status.storeCount).toBe(0);
      expect(status.cacheAge).toBeNull();
      expect(status.ttlRemaining).toBeNull();
    });

    it('should return cache info after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await getAllCatalogStoreIds();
      const status = getCacheStatus();

      expect(status.isCached).toBe(true);
      expect(status.storeCount).toBe(5);
      expect(status.cacheAge).toBeGreaterThanOrEqual(0);
      expect(status.ttlRemaining).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await getAllCatalogStoreIds();
      expect(getCacheStatus().isCached).toBe(true);

      clearCache();
      expect(getCacheStatus().isCached).toBe(false);

      await getAllCatalogStoreIds();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
