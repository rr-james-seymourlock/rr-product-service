import type { RawProductViewEvent } from '../../types.js';

/**
 * Toolbar event - Target with product IDs in offers
 * Store: Target (5246)
 */
export const targetToolbarEvent: RawProductViewEvent = {
  store_id: 5246,
  store_name: 'target.com',
  name: 'Womens Short Sleeve Slim Fit Ribbed T-Shirt',
  url: 'https://www.target.com/p/women-s-short-sleeve-slim-fit-ribbed-t-shirt-a-new-day-8482/-/A-88056717',
  image_url: 'https://target.scene7.com/is/image/Target/GUEST_image',
  sku: [],
  gtin: [],
  productID: [],
  mpn: [],
  offers: [
    { price: 800, sku: '88056717', url: 'https://www.target.com/p/-/A-88056717' },
    { price: 800, sku: '88056723', url: 'https://www.target.com/p/-/A-88056723' },
    { price: 800, sku: '88056720', url: 'https://www.target.com/p/-/A-88056720' },
  ],
  urlToSku: {
    'https://www.target.com/p/-/A-88056717': '88056717',
    'https://www.target.com/p/-/A-88056723': '88056723',
    'https://www.target.com/p/-/A-88056720': '88056720',
  },
  priceToSku: {
    '800': '88056717',
  },
  brand: 'A New Day',
  rating: 4.2,
  description: 'Comfortable ribbed t-shirt for everyday wear',
  category: "Women's Clothing",
  application_type: 'Toolbar',
};

/**
 * App event - Macy's with _list suffix fields
 * Store: Macy's (8333)
 */
export const macysAppEvent: RawProductViewEvent = {
  store_id: '8333',
  store_name: "Macy's",
  name: "Women's Cotton Sweater",
  url: 'https://www.macys.com/shop/product/womens-cotton-sweater?ID=12345678',
  image_url_list: [
    'https://slimages.macysassets.com/image1.jpg',
    'https://slimages.macysassets.com/image2.jpg',
  ],
  sku_list: ['12345678'],
  gtin_list: [],
  productid_list: [],
  mpn_list: [],
  offer_list: [{ offer_amount: 4900, offer_currency: 'USD', offer_sku: '12345678' }],
  brand_list: ['Charter Club'],
  application_type: 'App',
  device_platform: 'iOS',
};

/**
 * Toolbar event - Old Navy with multiple size variants
 * Store: Old Navy (5220)
 */
export const oldNavyVariantsEvent: RawProductViewEvent = {
  store_id: 5220,
  store_name: 'oldnavy.gap.com',
  name: "Men's Slim Built-In Flex Jeans",
  url: 'https://oldnavy.gap.com/browse/product.do?pid=874532002',
  image_url: 'https://oldnavy.gap.com/webcontent/image.jpg',
  sku: [
    '874532012',
    '874532022',
    '874532032',
    '874532042',
    '874532052',
    '874532062',
    '874532072',
    '874532082',
    '874532092',
  ],
  gtin: [],
  productID: ['874532002'],
  mpn: [],
  offers: [
    { price: 4999, sku: '874532012' },
    { price: 4999, sku: '874532022' },
    { price: 4999, sku: '874532032' },
  ],
  urlToSku: {},
  priceToSku: {},
  brand: 'Old Navy',
  category: "Men's Jeans",
  color: 'Dark Wash',
  application_type: 'Toolbar',
};

/**
 * Toolbar event - HP with multiple distinct products on page
 * Store: HP (5421)
 */
export const hpMultiProductEvent: RawProductViewEvent = {
  store_id: 5421,
  store_name: 'hp.com',
  name: 'HP Laptops',
  url: 'https://www.hp.com/us-en/shop/mlp/laptops',
  image_url: 'https://www.hp.com/content/dam/hp-web/laptops.jpg',
  sku: ['1A2B3C', '4D5E6F', '7G8H9I', '0J1K2L', '3M4N5O', '6P7Q8R', '9S0T1U', '2V3W4X'],
  gtin: [
    '0196188997123',
    '0196188997456',
    '0196188997789',
    '0196188998012',
    '0196188998345',
    '0196188998678',
    '0196188998901',
    '0196188999234',
  ],
  productID: [],
  mpn: ['8X5P1UA', '8X5P2UA', '8X5P3UA', '8X5P4UA', '8X5P5UA', '8X5P6UA', '8X5P7UA', '8X5P8UA'],
  offers: [
    { price: 54999, sku: '1A2B3C', url: 'https://www.hp.com/us-en/shop/pdp/hp-laptop-1' },
    { price: 64999, sku: '4D5E6F', url: 'https://www.hp.com/us-en/shop/pdp/hp-laptop-2' },
    { price: 74999, sku: '7G8H9I', url: 'https://www.hp.com/us-en/shop/pdp/hp-laptop-3' },
    { price: 84999, sku: '0J1K2L', url: 'https://www.hp.com/us-en/shop/pdp/hp-laptop-4' },
  ],
  urlToSku: {
    'https://www.hp.com/us-en/shop/pdp/hp-laptop-1': '1A2B3C',
    'https://www.hp.com/us-en/shop/pdp/hp-laptop-2': '4D5E6F',
    'https://www.hp.com/us-en/shop/pdp/hp-laptop-3': '7G8H9I',
    'https://www.hp.com/us-en/shop/pdp/hp-laptop-4': '0J1K2L',
  },
  priceToSku: {},
  brand: 'HP',
  category: 'Laptops',
  application_type: 'Toolbar',
};

/**
 * Toolbar event - Kate Spade Outlet with sparse data
 * Store: Kate Spade Outlet (35936)
 */
export const kateSpadeOutletSparseEvent: RawProductViewEvent = {
  store_id: 35936,
  store_name: 'katespadeoutlet.com',
  name: 'Madison Saffiano Leather Medium Satchel',
  url: 'https://www.katespadeoutlet.com/products/madison-saffiano-leather-medium-satchel~KC510',
  image_url: '',
  sku: [],
  gtin: [],
  productID: [],
  mpn: [],
  offers: [],
  urlToSku: {},
  priceToSku: {},
  application_type: 'Toolbar',
};

/**
 * App event - Walmart with mixed identifiers
 * Store: Walmart (5246)
 */
export const walmartAppEvent: RawProductViewEvent = {
  store_id: '5246',
  store_name: 'Walmart',
  name: 'Samsung 65" Class 4K Crystal UHD Smart TV',
  url: 'https://www.walmart.com/ip/Samsung-65-Class-4K-Crystal-UHD/123456789',
  image_url_list: ['https://i5.walmartimages.com/samsung-tv.jpg'],
  sku_list: ['123456789'],
  gtin_list: ['0887276123456'],
  productid_list: ['WM123456789'],
  mpn_list: ['UN65TU7000'],
  offer_list: [{ offer_amount: 44800, offer_currency: 'USD', offer_sku: '123456789' }],
  brand_list: ['Samsung'],
  color_list: ['Black'],
  rating: 4.5,
  description: '65 inch 4K Crystal UHD Smart TV with HDR',
  breadcrumbs: 'Electronics > TVs > Samsung TVs',
  application_type: 'App',
};

/**
 * Toolbar event - Amazon with ASIN as product ID
 * Store: Amazon (2087)
 */
export const amazonToolbarEvent: RawProductViewEvent = {
  store_id: 2087,
  store_name: 'amazon.com',
  name: 'Apple AirPods Pro (2nd Generation)',
  url: 'https://www.amazon.com/dp/B0D1XD1ZV3',
  image_url: 'https://m.media-amazon.com/images/I/airpods.jpg',
  sku: ['B0D1XD1ZV3'],
  gtin: ['0194253944133'],
  productID: ['B0D1XD1ZV3'],
  mpn: ['MQD83AM/A'],
  offers: [{ price: 24999, sku: 'B0D1XD1ZV3' }],
  urlToSku: {},
  priceToSku: {},
  brand: 'Apple',
  rating: 4.7,
  category: 'Electronics > Headphones',
  application_type: 'Toolbar',
};

/**
 * Event with no product identifiers - should fallback to URL extraction
 * Store: Generic (9999)
 */
export const noSchemaIdsEvent: RawProductViewEvent = {
  store_id: 9999,
  store_name: 'example.com',
  name: 'Test Product',
  url: 'https://www.example.com/product/PROD-12345',
  image_url: 'https://www.example.com/image.jpg',
  sku: [],
  gtin: [],
  productID: [],
  mpn: [],
  offers: [],
  urlToSku: {},
  priceToSku: {},
  application_type: 'Toolbar',
};

/**
 * Event with empty/missing fields
 */
export const minimalEvent: RawProductViewEvent = {
  store_id: 1234,
  name: 'Minimal Product',
  url: 'https://www.example.com/product',
};

/**
 * Event with only store_id - edge case
 */
export const emptyProductEvent: RawProductViewEvent = {
  store_id: 1234,
};

/**
 * Event with whitespace values that should be filtered
 */
export const whitespaceEvent: RawProductViewEvent = {
  store_id: 1234,
  name: '   ',
  url: '  ',
  image_url: '\t\n',
  sku: ['', '  ', 'VALID-SKU'],
  gtin: [''],
  productID: [],
  offers: [{ sku: '  ' }, { sku: 'VALID-OFFER-SKU' }],
};
