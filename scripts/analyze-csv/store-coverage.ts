#!/usr/bin/env npx tsx
/**
 * @fileoverview Analyzes a CSV file to determine store coverage.
 * Reports which storeIds from the CSV are in our store-registry and which are missing.
 *
 * Usage: npx tsx scripts/analyze-csv/store-coverage.ts <path-to-csv>
 *
 * Expected CSV format:
 * - Must have a header row
 * - Must contain columns for storeId and storeName (case-insensitive, supports variations)
 */

import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { parse } from 'csv-parse';
import { STORE_ID_CONFIG } from '@rr/store-registry';

const REPORTS_DIR = resolve(import.meta.dirname, 'reports');

type StoreInfo = {
  id: string;
  name: string;
  count: number;
  rowsWithIds: number;
  rowsWithProductIds: number;
};

type CoverageResult = {
  covered: Map<string, StoreInfo>;
  missing: Map<string, StoreInfo>;
};

/**
 * Finds the column index for a given set of possible column names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const index = lowerHeaders.indexOf(name.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Checks if product_ids JSON array has any entries
 */
function hasProductIds(productIdsJson: string): boolean {
  if (!productIdsJson || productIdsJson.trim() === '' || productIdsJson.trim() === '[]') {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(productIdsJson);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Parses CSV and extracts unique storeId/storeName pairs with counts and ID extraction stats
 */
async function parseCSV(filePath: string): Promise<Map<string, StoreInfo>> {
  const stores = new Map<string, StoreInfo>();

  return new Promise((resolve, reject) => {
    let headers: string[] = [];
    let storeIdIndex = -1;
    let storeNameIndex = -1;
    let urlIdsCsvIndex = -1;
    let productIdsIndex = -1;
    let isFirstRow = true;

    const parser = parse({
      relaxColumnCount: true,
      skipEmptyLines: true,
    });

    createReadStream(filePath)
      .pipe(parser)
      .on('data', (row: string[]) => {
        if (isFirstRow) {
          headers = row;
          storeIdIndex = findColumnIndex(headers, [
            'storeid',
            'store_id',
            'store-id',
            'id',
            'merchant_id',
            'merchantid',
          ]);
          storeNameIndex = findColumnIndex(headers, [
            'storename',
            'store_name',
            'store-name',
            'name',
            'merchant_name',
            'merchantname',
            'domain',
          ]);
          urlIdsCsvIndex = findColumnIndex(headers, [
            'url_ids_csv',
            'url_ids',
            'ids',
            'extracted_ids',
          ]);
          productIdsIndex = findColumnIndex(headers, ['product_ids', 'productids', 'product_id']);

          if (storeIdIndex === -1) {
            reject(new Error(`Could not find storeId column. Headers: ${headers.join(', ')}`));
            return;
          }

          isFirstRow = false;
          return;
        }

        const storeId = row[storeIdIndex]?.trim();
        if (!storeId) return;

        const storeName =
          storeNameIndex !== -1 ? row[storeNameIndex]?.trim() || 'Unknown' : 'Unknown';
        const urlIdsCsv = urlIdsCsvIndex !== -1 ? row[urlIdsCsvIndex]?.trim() || '' : '';
        const productIdsJson = productIdsIndex !== -1 ? row[productIdsIndex]?.trim() || '' : '';
        const hasIds = urlIdsCsv.length > 0;
        const hasProducts = hasProductIds(productIdsJson);

        if (stores.has(storeId)) {
          const existing = stores.get(storeId)!;
          existing.count++;
          if (hasIds) existing.rowsWithIds++;
          if (hasProducts) existing.rowsWithProductIds++;
        } else {
          stores.set(storeId, {
            id: storeId,
            name: storeName,
            count: 1,
            rowsWithIds: hasIds ? 1 : 0,
            rowsWithProductIds: hasProducts ? 1 : 0,
          });
        }
      })
      .on('end', () => resolve(stores))
      .on('error', reject);
  });
}

/**
 * Analyzes store coverage against our registry
 */
function analyzeCoverage(csvStores: Map<string, StoreInfo>): CoverageResult {
  const covered = new Map<string, StoreInfo>();
  const missing = new Map<string, StoreInfo>();

  for (const [storeId, info] of csvStores) {
    if (STORE_ID_CONFIG.has(storeId)) {
      covered.set(storeId, info);
    } else {
      missing.set(storeId, info);
    }
  }

  return { covered, missing };
}

/**
 * Calculates ID extraction percentage for a store
 */
function getIdExtractionPercent(store: StoreInfo): number {
  return store.count > 0 ? (store.rowsWithIds / store.count) * 100 : 0;
}

/**
 * Calculates product match percentage for a store
 */
function getProductMatchPercent(store: StoreInfo): number {
  return store.count > 0 ? (store.rowsWithProductIds / store.count) * 100 : 0;
}

/**
 * Generates the coverage report as a string
 */
function generateReport(result: CoverageResult, totalRows: number, csvPath: string): string {
  const lines: string[] = [];
  const totalStores = result.covered.size + result.missing.size;
  const coveragePercent = ((result.covered.size / totalStores) * 100).toFixed(1);

  lines.push('='.repeat(100));
  lines.push('STORE COVERAGE ANALYSIS');
  lines.push('='.repeat(100));
  lines.push('');
  lines.push(`Source: ${basename(csvPath)}`);
  lines.push(`Generated: ${new Date().toISOString()}`);

  lines.push('');
  lines.push(`Total unique stores in CSV: ${totalStores}`);
  lines.push(`Stores in registry: ${result.covered.size} (${coveragePercent}%)`);
  lines.push(
    `Stores missing: ${result.missing.size} (${(100 - parseFloat(coveragePercent)).toFixed(1)}%)`,
  );

  // Calculate row coverage
  let coveredRows = 0;
  let totalRowsWithIds = 0;
  let totalRowsWithProductIds = 0;
  for (const info of result.covered.values()) {
    coveredRows += info.count;
    totalRowsWithIds += info.rowsWithIds;
    totalRowsWithProductIds += info.rowsWithProductIds;
  }
  for (const info of result.missing.values()) {
    totalRowsWithIds += info.rowsWithIds;
    totalRowsWithProductIds += info.rowsWithProductIds;
  }
  const rowCoveragePercent = ((coveredRows / totalRows) * 100).toFixed(1);
  const rowsWithIdsPercent = ((totalRowsWithIds / totalRows) * 100).toFixed(1);
  const rowsMissingIdsPercent = (((totalRows - totalRowsWithIds) / totalRows) * 100).toFixed(1);
  const rowsWithProductIdsPercent = ((totalRowsWithProductIds / totalRows) * 100).toFixed(1);

  lines.push('');
  lines.push(
    `Row coverage: ${coveredRows.toLocaleString()} of ${totalRows.toLocaleString()} rows (${rowCoveragePercent}%)`,
  );

  lines.push('');
  lines.push('-'.repeat(100));
  lines.push('ID EXTRACTION STATS:');
  lines.push('-'.repeat(100));
  lines.push(
    `Rows with extracted IDs: ${totalRowsWithIds.toLocaleString()} of ${totalRows.toLocaleString()} (${rowsWithIdsPercent}%)`,
  );
  lines.push(
    `Rows missing IDs: ${(totalRows - totalRowsWithIds).toLocaleString()} of ${totalRows.toLocaleString()} (${rowsMissingIdsPercent}%)`,
  );
  lines.push('');
  lines.push('-'.repeat(100));
  lines.push('PRODUCT MATCH STATS:');
  lines.push('-'.repeat(100));
  lines.push(
    `Rows with matched products: ${totalRowsWithProductIds.toLocaleString()} of ${totalRows.toLocaleString()} (${rowsWithProductIdsPercent}%)`,
  );
  lines.push(
    `Rows without matched products: ${(totalRows - totalRowsWithProductIds).toLocaleString()} of ${totalRows.toLocaleString()} (${(100 - parseFloat(rowsWithProductIdsPercent)).toFixed(1)}%)`,
  );

  if (result.covered.size > 0) {
    lines.push('');
    lines.push('-'.repeat(100));
    lines.push('COVERED STORES (in registry):');
    lines.push('-'.repeat(100));

    const sortedCovered = [...result.covered.values()].sort((a, b) => b.count - a.count);
    lines.push(
      `${'ID'.padEnd(10)} ${'Name'.padEnd(30)} ${'Rows'.padStart(10)} ${'W/IDs'.padStart(10)} ${'ID %'.padStart(8)} ${'W/Prod'.padStart(10)} ${'Prod %'.padStart(8)}`,
    );
    lines.push('-'.repeat(88));
    for (const store of sortedCovered) {
      const idPercent = getIdExtractionPercent(store);
      const prodPercent = getProductMatchPercent(store);
      lines.push(
        `${store.id.padEnd(10)} ${store.name.slice(0, 30).padEnd(30)} ${store.count.toLocaleString().padStart(10)} ${store.rowsWithIds.toLocaleString().padStart(10)} ${idPercent.toFixed(1).padStart(7)}% ${store.rowsWithProductIds.toLocaleString().padStart(10)} ${prodPercent.toFixed(1).padStart(7)}%`,
      );
    }
  }

  if (result.missing.size > 0) {
    lines.push('');
    lines.push('-'.repeat(100));
    lines.push('MISSING STORES (not in registry):');
    lines.push('-'.repeat(100));

    const sortedMissing = [...result.missing.values()].sort((a, b) => b.count - a.count);
    lines.push(
      `${'ID'.padEnd(10)} ${'Name'.padEnd(30)} ${'Rows'.padStart(10)} ${'W/IDs'.padStart(10)} ${'ID %'.padStart(8)} ${'W/Prod'.padStart(10)} ${'Prod %'.padStart(8)}`,
    );
    lines.push('-'.repeat(88));
    for (const store of sortedMissing) {
      const idPercent = getIdExtractionPercent(store);
      const prodPercent = getProductMatchPercent(store);
      lines.push(
        `${store.id.padEnd(10)} ${store.name.slice(0, 30).padEnd(30)} ${store.count.toLocaleString().padStart(10)} ${store.rowsWithIds.toLocaleString().padStart(10)} ${idPercent.toFixed(1).padStart(7)}% ${store.rowsWithProductIds.toLocaleString().padStart(10)} ${prodPercent.toFixed(1).padStart(7)}%`,
      );
    }
  }

  lines.push('');
  lines.push('='.repeat(100));

  return lines.join('\n');
}

/**
 * Writes report to file
 */
function writeReport(report: string, csvPath: string): string {
  // Ensure reports directory exists
  mkdirSync(REPORTS_DIR, { recursive: true });

  const csvName = basename(csvPath, '.csv');

  // Use fixed filename for example.csv, timestamped for others
  const reportFilename =
    csvName === 'example'
      ? 'example-report.txt'
      : `store-coverage_${csvName}_${new Date().toISOString().slice(0, 10)}.txt`;

  const reportPath = resolve(REPORTS_DIR, reportFilename);

  writeFileSync(reportPath, report, 'utf-8');

  return reportPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const csvArg = args[0];

  if (!csvArg) {
    console.error('Usage: pnpm tsx scripts/analyze-csv/store-coverage.ts <path-to-csv>');
    console.error(
      '\nExample: pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/data/urls.csv',
    );
    process.exit(1);
  }

  const csvPath = resolve(csvArg);
  console.log(`Analyzing: ${csvPath}`);

  try {
    const csvStores = await parseCSV(csvPath);
    let totalRows = 0;
    for (const info of csvStores.values()) totalRows += info.count;

    const result = analyzeCoverage(csvStores);
    const report = generateReport(result, totalRows, csvPath);

    // Print to console
    console.log(report);

    // Write to file
    const reportPath = writeReport(report, csvPath);
    console.log(`\nReport saved to: ${reportPath}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
