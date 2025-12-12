/**
 * Columbia Sportswear Session Fixture - Real iOS app browsing session
 *
 * User browsed Columbia products on iOS app, viewed infant jackets and women's fleece,
 * then added multiple items to cart including some not viewed.
 *
 * Key characteristics:
 * - Columbia URL pattern: /p/{slug}-{productId}.html
 * - Product ID (MPN) embedded in URL
 * - Image URLs contain product ID: /{productId}_{colorCode}_f_om
 * - SKUs are UPC codes (12-digit barcodes)
 * - MPNs match the URL extracted IDs
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'columbia-session-001',
  description:
    'iOS app browsing session with 5 product views and 3 unique cart items (some not viewed)',
  storeId: '10437',
  storeName: 'Columbia Sportswear',

  /**
   * Expected matches based on manual analysis:
   * - Benton Springs Jacket: viewed, should match via URL or extracted_id
   * - Infant Kitterwibbit Jacket (703): viewed, should match via URL or extracted_id
   * - Infant Kitterwibbit Jacket (775): viewed, should match via URL or extracted_id
   */
  expectedMatches: [
    {
      cartItemName: "Women's Benton Springs™ Full Zip Fleece Jacket - Petite",
      productSku: '1372113',
      confidence: 'medium' as const,
      reason: 'URL match and extracted_id 1372113 from URL matches MPN',
    },
    {
      cartItemName: 'Infant Kitterwibbit™ III Jacket',
      productSku: '2088852',
      confidence: 'medium' as const,
      reason: 'URL match and extracted_id 2088852 from URL matches MPN',
    },
  ],

  /**
   * Raw product view events from the session
   * Note: Multiple views of same product consolidated
   */
  productViews: [
    {
      amount: '22.5',
      app_version: '12.23.2',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['597', '010', '433', '397', '434', '703', '608', '775'],
      currency: 'USD',
      description:
        'Dress your baby up in this light-rain-resistant, fleece-lined jacket with a fun dinosaur design.',
      gtin_list: [],
      image_url_list: ['https://media.columbia.com/i/columbia/2088852_608_f_pu'],
      mpn_list: ['2088852'],
      name: 'Infant Kitterwibbit™ III Jacket',
      offer_list: [{ offer_amount: '22.5', offer_currency: 'USD' }],
      productid_list: [],
      rating: [],
      sku_list: [
        '195981310344',
        '195981310337',
        '195981310351',
        '195981310368',
        '195981310375',
        '195981310382',
        '195981310429',
        '195981310399',
        '195981310412',
        '195981310405',
      ],
      store_id: '10437',
      store_name: 'Columbia Sportswear',
      url: 'https://www.columbia.com/p/infant-kitterwibbit-iii-jacket-2088852.html',
      created_ts: '1765325830',
    },
    {
      amount: '39',
      app_version: '12.23.2',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['697', '034', '010', '030', '671', '125', '425', '619', '430', '370'],
      currency: 'USD',
      description:
        'A petite version of a modern-classic fleece that is perfect to layer on top or underneath other layers.',
      gtin_list: [],
      image_url_list: ['https://media.columbia.com/i/columbia/ImagePlaceholder_COL'],
      mpn_list: ['1372113'],
      name: "Women's Benton Springs™ Full Zip Fleece Jacket - Petite",
      offer_list: [
        { offer_amount: '39', offer_currency: 'USD' },
        { offer_amount: '23', offer_currency: 'USD' },
      ],
      productid_list: [],
      rating: [],
      sku_list: [
        '190178977058',
        '191454687401',
        '190178977041',
        '191454687425',
        '191454687418',
        '190178977065',
        '190178977089',
        '191454687432',
        '190178977072',
        '191454687395',
      ],
      store_id: '10437',
      store_name: 'Columbia Sportswear',
      url: 'https://www.columbia.com/p/womens-benton-springs-full-zip-fleece-jacket---petite-1372113.html',
      created_ts: '1765326046',
    },
  ],

  /**
   * Raw cart events from the session
   * Using the last cart snapshot with final items
   */
  cartEvents: [
    {
      app_version: '12.23.2',
      application_subtype: 'iPhone',
      application_type: 'App',
      cart_total: 8306,
      cart_total_qty: 3,
      currency: 'USD',
      page_url: 'https://www.columbia.com/cart',
      product_list: [
        {
          image_url: 'https://media.columbia.com/i/columbia/1372113_625_f_om?w=375&fmt=auto',
          item_price: 3900,
          line_total: 3900,
          name: "Women's Benton Springs™ Full Zip Fleece Jacket - Petite",
          quantity: 1,
          url: 'https://www.columbia.com/p/womens-benton-springs-full-zip-fleece-jacket---petite-1372113.html',
        },
        {
          image_url: 'https://media.columbia.com/i/columbia/2088852_703_f_pu?w=375&fmt=auto',
          item_price: 1800,
          line_total: 1800,
          name: 'Infant Kitterwibbit™ III Jacket',
          quantity: 1,
          url: 'https://www.columbia.com/p/infant-kitterwibbit-iii-jacket-2088852.html',
        },
        {
          image_url: 'https://media.columbia.com/i/columbia/2088852_775_f_pu?w=375&fmt=auto',
          item_price: 1800,
          line_total: 1800,
          name: 'Infant Kitterwibbit™ III Jacket',
          quantity: 1,
          url: 'https://www.columbia.com/p/infant-kitterwibbit-iii-jacket-2088852.html',
        },
      ],
      store_id: '10437',
      store_name: 'Columbia Sportswear',
      created_ts: '1765326193',
    },
  ],
};
