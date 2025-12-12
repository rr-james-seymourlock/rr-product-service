/**
 * Old Navy Session Fixture - Cross-variant SKU matching test case
 *
 * This fixture tests the `extracted_id_sku` matching strategy where:
 * - User views a product page for one variant (e.g., pid=7873200220003)
 * - The product page lists all available variant SKUs (including 7873200220004)
 * - User adds a DIFFERENT variant to cart (pid=7873200220004)
 * - The cart extractedId matches a product's SKU list, not its extractedId
 *
 * Key characteristics:
 * - Gap/Old Navy uses numeric PIDs as identifiers
 * - Product pages list ALL variant SKUs in the sku_list
 * - Cart URLs contain ?pid={variant_id}
 * - Tests the extracted_id_sku matching strategy
 *
 * Expected match rate: 25% (1/4 items) - only the sweater matches
 * Match methods: extracted_id_sku (high confidence)
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'oldnavy-session-001',
  description: 'Old Navy session testing extracted_id_sku matching for cross-variant matches',
  storeId: '5216',
  storeName: 'Old Navy',

  /**
   * Expected matches based on manual analysis:
   * - Shawl-Collar Pullover: Cart extractedId 7873200220004 matches product sku_list
   *   (Product was viewed with pid=7873200220003 but lists 7873200220004 in SKUs)
   * - Other items: Not viewed, should not match
   */
  expectedMatches: [
    {
      cartItemName: 'Shawl-Collar Pullover Sweater for Boys',
      productSku: '7873200220004',
      confidence: 'high' as const,
      reason: 'Cart extractedId matches product SKU list via extracted_id_sku strategy',
    },
  ],

  /**
   * Raw product view events from the session
   * User viewed 4 products, including the sweater (different variant than cart)
   */
  productViews: [
    {
      // Viewed variant 003, but SKU list includes 004 which is in cart
      amount: '34.99',
      currency: 'USD',
      description:
        "This cozy shawl-collar sweater is perfect for layering. With a relaxed fit and soft knit fabric, it's a wardrobe staple for fall and winter.",
      image_url_list: ['https://oldnavy.gap.com/webcontent/0055/004/703/cn55004703.jpg'],
      name: 'Shawl-Collar Pullover Sweater for Boys',
      productid_list: ['7873200220003'],
      rating: ['4.5'],
      // This is the key: product page lists ALL variant SKUs
      sku_list: [
        '7873200220001',
        '7873200220002',
        '7873200220003',
        '7873200220004',
        '7873200220005',
      ],
      mpn_list: [],
      gtin_list: [],
      store_id: '5216',
      store_name: 'Old Navy',
      url: 'https://oldnavy.gap.com/browse/product.do?pid=7873200220003',
    },
    {
      amount: '24.99',
      currency: 'USD',
      description: 'Classic denim jacket with a modern fit.',
      image_url_list: ['https://oldnavy.gap.com/webcontent/0055/005/801/cn55005801.jpg'],
      name: 'Jean Jacket for Boys',
      productid_list: ['6523100110002'],
      rating: ['4.7'],
      sku_list: ['6523100110001', '6523100110002', '6523100110003'],
      mpn_list: [],
      gtin_list: [],
      store_id: '5216',
      store_name: 'Old Navy',
      url: 'https://oldnavy.gap.com/browse/product.do?pid=6523100110002',
    },
    {
      amount: '19.99',
      currency: 'USD',
      description: 'Soft and comfortable long-sleeve tee.',
      image_url_list: ['https://oldnavy.gap.com/webcontent/0055/006/102/cn55006102.jpg'],
      name: 'Softest Long-Sleeve T-Shirt for Boys',
      productid_list: ['8901200330001'],
      rating: ['4.8'],
      sku_list: ['8901200330001', '8901200330002'],
      mpn_list: [],
      gtin_list: [],
      store_id: '5216',
      store_name: 'Old Navy',
      url: 'https://oldnavy.gap.com/browse/product.do?pid=8901200330001',
    },
    {
      amount: '29.99',
      currency: 'USD',
      description: 'Built-in flex for all-day comfort.',
      image_url_list: ['https://oldnavy.gap.com/webcontent/0055/007/205/cn55007205.jpg'],
      name: 'Built-In Flex Straight Jeans for Boys',
      productid_list: ['5467800440003'],
      rating: ['4.6'],
      sku_list: ['5467800440001', '5467800440002', '5467800440003', '5467800440004'],
      mpn_list: [],
      gtin_list: [],
      store_id: '5216',
      store_name: 'Old Navy',
      url: 'https://oldnavy.gap.com/browse/product.do?pid=5467800440003',
    },
  ],

  /**
   * Raw cart events from the session
   * 4 items in cart - only the sweater was viewed (different variant)
   */
  cartEvents: [
    {
      cart_total: 10996,
      cart_total_qty: 4,
      currency: 'USD',
      product_list: [
        {
          // This variant (004) was NOT directly viewed, but 003 was viewed
          // Should match via extracted_id_sku because product.skus contains 7873200220004
          image_url: 'https://oldnavy.gap.com/webcontent/0055/004/703/cn55004703.jpg',
          item_price: 3499,
          line_total: 3499,
          name: 'Shawl-Collar Pullover Sweater for Boys',
          quantity: 1,
          url: 'https://oldnavy.gap.com/browse/product.do?pid=7873200220004',
        },
        {
          // Not viewed - different product entirely
          image_url: 'https://oldnavy.gap.com/webcontent/0055/008/901/cn55008901.jpg',
          item_price: 1999,
          line_total: 1999,
          name: 'Graphic Hoodie for Boys',
          quantity: 1,
          url: 'https://oldnavy.gap.com/browse/product.do?pid=9012300550001',
        },
        {
          // Not viewed
          image_url: 'https://oldnavy.gap.com/webcontent/0055/009/102/cn55009102.jpg',
          item_price: 2499,
          line_total: 2499,
          name: 'Fleece Joggers for Boys',
          quantity: 1,
          url: 'https://oldnavy.gap.com/browse/product.do?pid=1234500660001',
        },
        {
          // Not viewed
          image_url: 'https://oldnavy.gap.com/webcontent/0055/010/203/cn55010203.jpg',
          item_price: 2999,
          line_total: 2999,
          name: 'Puffer Vest for Boys',
          quantity: 1,
          url: 'https://oldnavy.gap.com/browse/product.do?pid=2345600770001',
        },
      ],
      store_id: '5216',
      store_name: 'Old Navy',
    },
  ],
};

export default fixture;
