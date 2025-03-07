import { describe, test } from 'vitest'
import { assertProductIdsMatch, storeFixtureTestCases } from './testUtils.js'
describe('Store __fixtures__ against storeConfigs and general extraction', () => {
  test.each(
    storeFixtureTestCases.flatMap(({ data }) =>
      data.testCases.map((testCase: { url: string; expectedSkus: string[] }) => ({
        storeName: data.name,
        storeId: data.id,
        url: testCase.url,
        expectedSkus: testCase.expectedSkus
      }))
    )
  )('should extract id from $storeName ($storeId) for URL: $url', ({ url, expectedSkus }) => {
    assertProductIdsMatch({ url, expectedSkus })
  })
})
