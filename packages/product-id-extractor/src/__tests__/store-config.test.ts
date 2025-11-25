import { describe, test } from 'vitest';

import { assertProductIdsMatch, storeFixtureTestCases } from './test-utils.js';

describe.concurrent('Store __fixtures__ against storeConfigs and general extraction', () => {
  test.concurrent.each(
    storeFixtureTestCases.flatMap(({ data }) =>
      data.testCases.map((testCase: { url: string; expectedSkus: string[] }) => ({
        storeName: data.name,
        storeId: data.id,
        url: testCase.url,
        expectedSkus: testCase.expectedSkus,
      })),
    ),
  )('should extract id from $storeName ($storeId) for URL: $url', async ({ url, expectedSkus }) => {
    assertProductIdsMatch({ url, expectedSkus });
  });
});
