#!/usr/bin/env npx tsx
/**
 * @fileoverview CBSP Store Coverage Analysis
 *
 * Two modes:
 * 1. Refresh: Pull store data from CBSP API and save to data/stores.json
 * 2. Report: Generate coverage report comparing store-registry to CBSP data
 *
 * Usage:
 *   pnpm tsx scripts/cbsp-coverage/store-coverage.ts              # Generate report only
 *   pnpm tsx scripts/cbsp-coverage/store-coverage.ts --refresh    # Refresh data then report
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { cbsp } from '@rr/api-client';

type StoreWithStatus = Awaited<ReturnType<typeof cbsp.getAllStoresWithStatus>>[number];
import { STORE_ID_CONFIG } from '@rr/store-registry';

const DATA_DIR = resolve(import.meta.dirname, 'data');
const REPORTS_DIR = resolve(import.meta.dirname, 'reports');
const STORES_FILE = resolve(DATA_DIR, 'stores.json');

type StoresData = {
  generatedAt: string;
  totalStores: number;
  catalogEnabled: number;
  catalogDisabled: number;
  stores: StoreWithStatus[];
};

/**
 * Fetches all stores from CBSP API and saves to stores.json
 */
async function refreshStoreData(): Promise<StoresData> {
  console.log('Fetching stores from CBSP API...');

  const stores = await cbsp.getAllStoresWithStatus();

  const catalogEnabled = stores.filter((s) => s.productSearchEnabled).length;
  const catalogDisabled = stores.length - catalogEnabled;

  const data: StoresData = {
    generatedAt: new Date().toISOString(),
    totalStores: stores.length,
    catalogEnabled,
    catalogDisabled,
    stores,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORES_FILE, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`Saved ${stores.length.toLocaleString()} stores to ${STORES_FILE}`);
  console.log('');

  return data;
}

/**
 * Loads store data from local JSON file
 */
function loadStoreData(): StoresData {
  if (!existsSync(STORES_FILE)) {
    throw new Error(`Store data not found. Run with --refresh first to fetch from CBSP API.`);
  }

  const content = readFileSync(STORES_FILE, 'utf-8');
  return JSON.parse(content) as StoresData;
}

/**
 * Generates coverage report comparing store-registry to CBSP data
 */
function generateCoverageReport(data: StoresData): string {
  const lines: string[] = [];

  // Get store IDs from our registry
  const registryStoreIds = new Set(STORE_ID_CONFIG.keys());

  // Get catalog-enabled store IDs from CBSP
  const catalogStores = data.stores.filter((s) => s.productSearchEnabled);
  const catalogStoreIds = new Set(catalogStores.map((s) => String(s.id)));

  // Calculate coverage
  const coveredStores: StoreWithStatus[] = [];
  const missingStores: StoreWithStatus[] = [];

  for (const store of catalogStores) {
    if (registryStoreIds.has(String(store.id))) {
      coveredStores.push(store);
    } else {
      missingStores.push(store);
    }
  }

  // Find stores in registry that aren't catalog-enabled (shouldn't happen but good to check)
  // Look up names from the full store list
  const allStoresById = new Map(data.stores.map((s) => [String(s.id), s]));
  const nonCatalogInRegistry: StoreWithStatus[] = [];
  for (const storeId of registryStoreIds) {
    if (!catalogStoreIds.has(storeId)) {
      const store = allStoresById.get(storeId);
      nonCatalogInRegistry.push({
        id: Number(storeId),
        name: store?.name ?? 'Unknown',
        productSearchEnabled: store?.productSearchEnabled ?? false,
      });
    }
  }

  const coveragePercent = ((coveredStores.length / catalogStores.length) * 100).toFixed(1);

  lines.push('='.repeat(80));
  lines.push('CBSP STORE COVERAGE REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Data source: ${STORES_FILE}`);
  lines.push(`Data generated: ${data.generatedAt}`);
  lines.push(`Report generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('-'.repeat(80));
  lines.push('SUMMARY');
  lines.push('-'.repeat(80));
  lines.push('');
  lines.push(`Total CBSP stores: ${data.totalStores.toLocaleString()}`);
  lines.push(`  - Catalog enabled: ${data.catalogEnabled.toLocaleString()}`);
  lines.push(`  - Catalog disabled: ${data.catalogDisabled.toLocaleString()}`);
  lines.push('');
  lines.push(`Store registry configs: ${registryStoreIds.size.toLocaleString()}`);
  lines.push('');
  lines.push(
    `COVERAGE: ${coveredStores.length} / ${catalogStores.length} catalog stores (${coveragePercent}%)`,
  );
  lines.push('');

  if (nonCatalogInRegistry.length > 0) {
    lines.push('-'.repeat(80));
    lines.push(
      `WARNING: ${nonCatalogInRegistry.length} stores in registry are NOT catalog-enabled:`,
    );
    lines.push('-'.repeat(80));
    lines.push(`${'ID'.padEnd(10)} ${'Name'.padEnd(50)}`);
    lines.push('-'.repeat(62));
    for (const store of nonCatalogInRegistry.sort((a, b) => a.id - b.id)) {
      lines.push(`${String(store.id).padEnd(10)} ${store.name.slice(0, 50).padEnd(50)}`);
    }
    lines.push('');
  }

  lines.push('-'.repeat(80));
  lines.push(`COVERED STORES (${coveredStores.length}):`);
  lines.push('-'.repeat(80));
  lines.push(`${'ID'.padEnd(10)} ${'Name'.padEnd(50)}`);
  lines.push('-'.repeat(62));
  for (const store of coveredStores.sort((a, b) => a.id - b.id)) {
    lines.push(`${String(store.id).padEnd(10)} ${store.name.slice(0, 50).padEnd(50)}`);
  }
  lines.push('');

  lines.push('-'.repeat(80));
  lines.push(`MISSING STORES (${missingStores.length}):`);
  lines.push('-'.repeat(80));
  lines.push(`${'ID'.padEnd(10)} ${'Name'.padEnd(50)}`);
  lines.push('-'.repeat(62));
  for (const store of missingStores.sort((a, b) => a.id - b.id)) {
    lines.push(`${String(store.id).padEnd(10)} ${store.name.slice(0, 50).padEnd(50)}`);
  }
  lines.push('');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Writes report to file
 */
function writeReport(report: string): string {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const reportFilename = `coverage_${new Date().toISOString().slice(0, 10)}.txt`;
  const reportPath = resolve(REPORTS_DIR, reportFilename);

  writeFileSync(reportPath, report, 'utf-8');

  return reportPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldRefresh = args.includes('--refresh');

  let data: StoresData;

  if (shouldRefresh) {
    data = await refreshStoreData();
  } else {
    try {
      data = loadStoreData();
      console.log(`Using cached data from ${data.generatedAt}`);
      console.log('');
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  const report = generateCoverageReport(data);

  // Print to console
  console.log(report);

  // Write to file
  const reportPath = writeReport(report);
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
