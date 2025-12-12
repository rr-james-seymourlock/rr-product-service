/**
 * Samsung Session Fixture - 50% match rate (partial viewing)
 *
 * User browsed Samsung laundry products and added washer + dryer to cart.
 * Only the washer was viewed; dryer was added directly without viewing product page.
 *
 * Key characteristics:
 * - Samsung URL pattern: -sku-{model}/ at end of path
 * - SKU format: MODEL/VARIANT (e.g., WF45T6000AV/A5)
 * - SKUs provided in sku_list for product views
 * - Cart items use same URL pattern for extraction
 * - Service items filtered out (protection plans, installation)
 *
 * Expected match rate: 50% (1/2 items)
 * Match methods: extracted_id_sku (high) + url (medium) + extracted_id (medium) + title (low)
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'samsung-session-001',
  description:
    'Samsung laundry session with 2 cart items (washer viewed, dryer not viewed), 50% match rate',
  storeId: '12109',
  storeName: 'Samsung',

  /**
   * Expected matches based on manual analysis:
   * - Washer: Should match via SKU extraction from URL (-sku-wf45t6000av-a5)
   * - Dryer: Should NOT match (was never viewed, added directly to cart)
   */
  expectedMatches: [
    {
      cartItemName:
        '4.5 cu. ft. Front Load Washer with Vibration Reduction Technology+ in Brushed Black',
      productSku: 'WF45T6000AV/A5',
      confidence: 'high' as const,
      reason: 'SKU match from URL pattern -sku-{model}/, extracted_id_sku strategy',
    },
  ],

  /**
   * Raw product view events from the session (deduplicated to 2 unique products)
   * User viewed 5 total events but only 2 unique washer products
   */
  productViews: [
    {
      amount: '699',
      currency: 'USD',
      description:
        '4.5 cu. ft. Large Capacity Smart Front Load Washer with Super Speed Wash (WF45B6300AP/US) - See the benefits and full features of this product. Learn more and find the best Laundry for you at Samsung US.',
      image_url_list: [
        'https://images.samsung.com/is/image/samsung/p6pim/us/wf45b6300ap-us/gallery/us-wf6300b-wf45b6300ap-us-549429832',
      ],
      name: '4.5 cu. ft. Large Capacity Smart Front Load Washer with Super Speed Wash',
      productid_list: [],
      rating: ['4.6324'],
      sku_list: ['WF45B6300AP/US'],
      mpn_list: [],
      gtin_list: [],
      store_id: '12109',
      store_name: 'Samsung',
      url: 'https://www.samsung.com/us/laundry/washers/front-load-wf6300b-front-loading-washer-superspeed-large-capacity-4-5-cu-ft-flexible-installation-4-5-cu-ft-platinum-sku-wf45b6300ap-us/',
    },
    {
      amount: '699',
      currency: 'USD',
      description:
        'WF6000T (WF45T6000AW) Front loading Washer With Self Clean+, VRT Plus™, Smart Care (WF45T6000AV/A5) - See the benefits and full features of this product. Learn more and find the best Laundry for you at Samsung US.',
      image_url_list: [
        'https://images.samsung.com/is/image/samsung/p6pim/us/wf45t6000av-a5/gallery/us-front-loading-washer-wf45t6000awa5-wf45t6000av-a5-549751229',
      ],
      name: '4.5 cu. ft. Front Load Washer with Vibration Reduction Technology+ in Brushed Black',
      productid_list: [],
      rating: ['4.5079'],
      sku_list: ['WF45T6000AV/A5'],
      mpn_list: [],
      gtin_list: [],
      store_id: '12109',
      store_name: 'Samsung',
      url: 'https://www.samsung.com/us/laundry/washers/front-load-wf6000r-front-loading-super-speed-4-5-cu-ft-black-sku-wf45t6000av-a5/',
    },
  ],

  /**
   * Raw cart events from the session
   * Final cart has 2 physical products (dryer + washer), filtering out services
   * Note: Original cart included services like "3-Year Samsung Care+" and "Install Washer"
   */
  cartEvents: [
    {
      cart_total: 0,
      cart_total_qty: 2,
      currency: 'USD',
      product_list: [
        {
          image_url:
            'https://image-us.samsung.com/SamsungUS/home/home-appliances/dryers/dv45t6000v-a3/DVE45T6000V_01_Black_SCOM.jpg?$default-400-jpg$',
          item_price: 0,
          line_total: 0,
          name: '7.5 cu. ft. Electric Dryer with Sensor Dry in Brushed Black',
          quantity: 1,
          url: 'https://www.samsung.com/us/home-appliances/dryers/electric/7-5-cu--ft--electric-dryer-with-sensor-dry-in-black-stainless-steel-dve45t6000v-a3',
        },
        {
          image_url:
            'https://images.samsung.com/is/image/samsung/p6pim/us/wf45t6000av-a5/gallery/us-front-loading-washer-wf45t6000awa5-wf45t6000av-a5-549751229?$PD_GALLERY_PNG$',
          item_price: 0,
          line_total: 0,
          name: '4.5 cu. ft. Front Load Washer with Vibration Reduction Technology+ in Brushed Black',
          quantity: 1,
          url: 'https://www.samsung.com/us/laundry/washers/front-load-wf6000r-front-loading-super-speed-4-5-cu-ft-black-sku-wf45t6000av-a5',
        },
      ],
      store_id: '12109',
      store_name: 'Samsung',
    },
  ],
};

export default fixture;
