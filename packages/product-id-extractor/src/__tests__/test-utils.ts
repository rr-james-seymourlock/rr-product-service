import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';

import { parseUrlComponents } from '@rr/url-parser';

import { extractIdsFromUrlComponents } from '../extractor';

export const END_OF_STRING_CHARS = [
  '',
  '/',
  '//',
  '.',
  '?',
  '$',
  '#',
  '?query=x',
  '/?query=x',
  '&query=x',
  '#fragment',
  '.do',
  '.html',
  '.htm',
  '.aspx',
  '.php',
  '?utm_source=test',
  '?ref=x',
  ';jsessionid=x',
  '?lang=en',
  '/reviews',
  '/details',
];

export const assertProductIdsMatch = ({
  url,
  expectedSkus,
}: {
  url: string;
  expectedSkus: string[];
}): void => {
  if (!url) {
    throw new Error('Invalid input: URL is required');
  }

  // Extract domain from URL
  const urlComponents = parseUrlComponents(url);

  // Extract and normalize product IDs
  const actualIds = [...extractIdsFromUrlComponents({ urlComponents }).productIds]
    .map((sku) => sku.toLowerCase())
    .sort();

  // Normalize expected SKUs
  const expectedIds = expectedSkus.map((sku) => sku.toLowerCase()).sort();

  expect(actualIds).toEqual(expectedIds);
};

/* eslint-disable */
const getStoreFixtureTestCases = (() => {
  let cachedFiles: Array<{ store: string; data: any }> | null = null;

  return () => {
    if (cachedFiles) return cachedFiles;

    const fixturesDir = path.join(__dirname, '..', '__fixtures__');

    try {
      cachedFiles = fs
        .readdirSync(fixturesDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
          try {
            return {
              store: path.basename(file, '.json'),
              data: JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf-8')),
            };
          } catch (error) {
            console.error(`Error reading fixture file ${file}:`, error);
            return null;
          }
        })
        .filter((file): file is NonNullable<typeof file> => file !== null);

      return cachedFiles;
    } catch (error) {
      console.error('Error reading fixtures directory:', error);
      return [];
    }
  };
})();

// Use the memoized function in your tests
export const storeFixtureTestCases = getStoreFixtureTestCases();
