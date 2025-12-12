/**
 * Ace Hardware Session Fixture - 100% match rate
 *
 * User browsed chainsaw equipment and accessories, added chainsaw kit and lubricant to cart.
 * Both cart items were viewed during the session.
 *
 * Key characteristics:
 * - Simple SKU pattern: numeric SKU as last path segment
 * - Product URLs: /departments/.../category/{sku}
 * - Cart URLs: /product/{sku}
 * - SKUs provided in sku_list
 * - GTINs and MPNs available
 *
 * Expected match rate: 100% (2/2 items)
 * Match methods: extracted_id_sku (high) + extracted_id (medium) + title (low) + price (low)
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'acehardware-session-001',
  description:
    'Ace Hardware iOS app session with 2 cart items (chainsaw kit + lubricant), both viewed, 100% match rate',
  storeId: '8302',
  storeName: 'Ace Hardware',

  /**
   * Expected matches based on manual analysis:
   * - Both cart items should match via SKU extraction from URL (last path segment)
   * - SKUs are numeric: 7037990, 7011706
   */
  expectedMatches: [
    {
      cartItemName:
        'DeWalt 20V MAX* DCCS621P1 12 in. 20 V Battery Chainsaw Kit (Battery & Charger)',
      productSku: '7037990',
      confidence: 'high' as const,
      reason: 'SKU match from URL last segment, extracted_id_sku strategy',
    },
    {
      cartItemName: 'EGO Power+ Bar and Chain Lubricant 1 pk',
      productSku: '7011706',
      confidence: 'high' as const,
      reason: 'SKU match from URL last segment, extracted_id_sku strategy',
    },
  ],

  /**
   * Raw product view events from the session (deduplicated to 5 unique products)
   * User browsed chainsaw kit, lubricants, and carrying cases
   */
  productViews: [
    {
      amount: '229',
      currency: 'USD',
      description:
        'The 20V MAX* 12 in. Compact Brushless Cordless Chainsaw Kit delivers a gas-free operation that eliminates cold starts, fumes, carburetor issues, and helps minimize maintenance compared to gas-powered chainsaws. This battery-powered chainsaw is designed for outdoor jobs like cutting tree limbs and branches. Lightweight design engineered to provide controlled cuts. This cordless, compact chainsaw features a high-efficiency brushless motor built to help maximize runtime. Powered by the included 20V MAX* battery, this chainsaw kit offers compact convenience and professional versatility.',
      image_url_list: [
        '//cdn-tp6.mozu.com/24645-37138/cms/37138/files/fcc1d365-dfa7-4cba-8c12-e498b9e0b7ef?_mzcb=_1762962175737',
      ],
      name: 'DeWalt 20V MAX* DCCS621P1 12 in. 20 V Battery Chainsaw Kit (Battery & Charger)',
      productid_list: [],
      rating: [],
      sku_list: ['7037990'],
      mpn_list: ['DCCS621P1'],
      gtin_list: ['885911994378'],
      store_id: '8302',
      store_name: 'Ace Hardware',
      url: 'https://www.acehardware.com/departments/lawn-and-garden/outdoor-power-equipment/chainsaws/7037990',
    },
    {
      amount: '12.99',
      currency: 'USD',
      description:
        'The EGO POWER+ 32 Fl Oz Premium Bar and chain lubricant is recommended for use with EGO POWER+ Chain Saws to extend bar and chain life for superior performance. The premium oil-free formula outperforms traditional bar and chain oils and is 100% bio-based and biodegradable. Genuine EGO parts are designed specifically for your EGO POWER+ products and offer the highest quality, performance, and value.',
      image_url_list: [
        '//cdn-tp6.mozu.com/24645-37138/cms/37138/files/db9a6097-6ef3-4fb7-a1fe-74b8a85b7f14?_mzcb=_1762962175737',
      ],
      name: 'EGO Power+ Bar and Chain Lubricant 1 pk',
      productid_list: [],
      rating: [],
      sku_list: ['7011706'],
      mpn_list: ['AOL3200'],
      gtin_list: ['692042014710'],
      store_id: '8302',
      store_name: 'Ace Hardware',
      url: 'https://www.acehardware.com/departments/lawn-and-garden/outdoor-power-equipment/chainsaw-parts/7011706',
    },
    {
      amount: '74',
      currency: 'USD',
      description:
        "Focus more on the day's work and less on lugging your power tool from job to job with this Chainsaw Kit Box. With storage space for a battery, charger, and a sharpening file, the box was designed to help you transport your chainsaw and attachments from one worksite to the next with less hassle. This versatile accessory was built to fit a variety of DeWalt Chainsaws. Battery, charger, and sharpening file sold separately.",
      image_url_list: [
        '//cdn-tp6.mozu.com/24645-37138/cms/37138/files/d3ed03df-95f7-4506-a757-fb0238898541?_mzcb=_1762962175737',
      ],
      name: 'DeWalt Chainsaw Carrying Case 1 pc',
      productid_list: [],
      rating: [],
      sku_list: ['7029898'],
      mpn_list: ['DZO6KBOX'],
      gtin_list: ['885911827010'],
      store_id: '8302',
      store_name: 'Ace Hardware',
      url: 'https://www.acehardware.com/departments/lawn-and-garden/outdoor-power-equipment/chainsaw-parts/7029898',
    },
    {
      amount: '54.99',
      currency: 'USD',
      description:
        'With its sleek and modern design, the STIHL chainsaw carrying case is an ideal way to store or transport your STIHL chainsaw when the job is done. The durable hinges provide added security, and two tie down points help to prevent against sliding during transport.The case is manufactured from high density polyethylene with double wall construction. This design reduces weight while providing excellent durability and can easily be cleaned of dirt and oil. Additionally, the STIHL chainsaw carrying case is designed for use with the scabbard provided with the saw. With availability in two different sizes, users have an option for most STIHL chainsaws. The medium case accommodates models MS 170 MS 500i (R wrap handle versions are excluded from both cases).',
      image_url_list: [
        '//cdn-tp6.mozu.com/24645-37138/cms/37138/files/c362ca18-96e8-4360-a6bf-076fc0f70a8c?_mzcb=_1762962175737',
      ],
      name: 'STIHL Medium Chainsaw Carrying Case',
      productid_list: [],
      rating: [],
      sku_list: ['7019692'],
      mpn_list: ['0000 900 4011'],
      gtin_list: ['886661869039'],
      store_id: '8302',
      store_name: 'Ace Hardware',
      url: 'https://www.acehardware.com/departments/lawn-and-garden/outdoor-power-equipment/chainsaw-parts/7019692',
    },
    {
      amount: '41.99',
      currency: 'USD',
      description:
        'DeWalt Biodegradable Chainsaw Oil is a high-performance bio-based formulation that is compatible with all gas and battery operated saws. As a 100 percent loss application, it is important to use biodegradable chainsaw oil to help reduce environmental pollution. This All-Seasons -15 deg. F bio-based chainsaw oil has a higher viscosity index than any petroleum chainsaw oil and is a USDA Certified Bio-based Product. Tested on thousands of cuts measured with thermocouples on the bar, motor and PCB, this oil is designed to maximize bar and chain life while being safer for the planet.',
      image_url_list: [
        '//cdn-tp6.mozu.com/24645-37138/cms/37138/files/01ccc25b-6b7a-4c91-82f7-eedc99ca1ec2?_mzcb=_1762962175737',
      ],
      name: 'DeWalt Biodegradable Bar and Chain Oil 1 pk',
      productid_list: [],
      rating: [],
      sku_list: ['7039761'],
      mpn_list: ['DXCC1202'],
      gtin_list: ['857454006641'],
      store_id: '8302',
      store_name: 'Ace Hardware',
      url: 'https://www.acehardware.com/departments/lawn-and-garden/outdoor-power-equipment/chainsaw-parts/7039761',
    },
  ],

  /**
   * Raw cart events from the session
   * Cart evolved: 2 items -> 1 item -> 2 items (final)
   * Final cart has chainsaw kit + lubricant
   */
  cartEvents: [
    {
      cart_total: 26142,
      cart_total_qty: 2,
      currency: 'USD',
      product_list: [
        {
          image_url:
            'https://cdn-tp6.mozu.com/24645-37138/cms/37138/files/fcc1d365-dfa7-4cba-8c12-e498b9e0b7ef',
          item_price: 22900,
          line_total: 22900,
          name: 'DeWalt 20V MAX* DCCS621P1 12 in. 20 V Battery Chainsaw Kit (Battery & Charger)',
          quantity: 1,
          url: 'https://www.acehardware.com/product/7037990',
        },
        {
          image_url:
            'https://cdn-tp6.mozu.com/24645-37138/cms/37138/files/db9a6097-6ef3-4fb7-a1fe-74b8a85b7f14',
          item_price: 1399,
          line_total: 1399,
          name: 'EGO Power+ Bar and Chain Lubricant 1 pk',
          quantity: 1,
          url: 'https://www.acehardware.com/product/7011706',
        },
      ],
      store_id: '8302',
      store_name: 'Ace Hardware',
    },
  ],
};

export default fixture;
