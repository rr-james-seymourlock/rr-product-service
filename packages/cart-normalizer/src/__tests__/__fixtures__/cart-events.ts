import type { RawCartEvent } from '../../types.js';

/**
 * MLB Shop - Mobile toolbar, no product URLs
 */
export const mlbShopEvent: RawCartEvent = {
  app_version: '5.14.0',
  application_subtype: 'MWToolbar',
  application_type: 'Toolbar',
  browser: 'Safari Mobile',
  browser_agent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
  cart_total: 5773,
  cart_total_qty: 1,
  client: 'toolbar',
  currency: 'USD',
  page_url: 'https://www.mlbshop.com/payment',
  platform: 'Toolbar',
  product_list: [
    {
      image_url:
        'https://fanatics.frgimages.com/new-york-mets/mens-black-new-york-mets-stranger-things-logo-lockup-pullover-hoodie_ss5_p-203189232+u-ao9znyudjyecddrxplzj+v-s6hdm1hwofwsbmnmhuot.jpg?_hv=2&w=180',
      item_price: 7499,
      line_total: 7499,
      name: "Men's New York Mets Black Stranger Things Logo Lockup Pullover Hoodie",
      quantity: 1,
    },
  ],
  session_id: 1764309138854,
  store_id: 5806,
  store_name: 'MLB Shop',
  tenant: 'ebates.com',
  timestamp: 1764548341260,
  toolbarid: 226334028,
  tracking_ticket: 'ebs6152704336sbe',
};

/**
 * Barnes & Noble - Multiple products with URLs
 */
export const barnesNobleEvent: RawCartEvent = {
  app_version: '5.76.1',
  application_subtype: 'Toolbar',
  application_type: 'Toolbar',
  browser: 'Chrome',
  browser_agent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  cart_total: 8292,
  cart_total_qty: 5,
  client: 'toolbar',
  currency: 'USD',
  free_shipping: true,
  page_url: 'https://www.barnesandnoble.com/checkout/',
  platform: 'Toolbar',
  product_list: [
    {
      image_url: 'https://prodimage.images-bn.com/pimages/9781488962103_p0_v1_s90x140.jpg',
      item_price: 900,
      line_total: 900,
      name: '365 Puzzles Sudoku',
      quantity: 1,
      url: 'https://www.barnesandnoble.com/w/365-puzzles-sudoku-clarity-media-hinkler/1145172432?ean=9781488962103',
    },
    {
      image_url: 'https://prodimage.images-bn.com/pimages/9780811856256_p0_v1_s90x140.jpg',
      item_price: 895,
      line_total: 895,
      name: 'Sudoku: Easy to Medium',
      quantity: 1,
      url: 'https://www.barnesandnoble.com/w/sudoku-easy-to-medium-zachary-pitkow/1100488994?ean=9780811856256',
    },
    {
      image_url: 'https://prodimage.images-bn.com/pimages/0196940195880_p0_v1_s90x140.jpg',
      item_price: 2999,
      line_total: 2999,
      name: 'Grey Knit Reading Blanket - Adult',
      quantity: 1,
      url: 'https://www.barnesandnoble.com/w/grey-knit-reading-blanket-adult-universal-knitwears/1147436434?ean=0196940195880',
    },
    {
      image_url: 'https://prodimage.images-bn.com/pimages/9781680524758_p0_v6_s90x140.jpg',
      item_price: 999,
      line_total: 999,
      name: 'Big Book Of Sudoku',
      quantity: 1,
      url: 'https://www.barnesandnoble.com/w/big-book-of-sudoku-parragon/1122154396?ean=9781680524758',
    },
    {
      image_url: 'https://prodimage.images-bn.com/pimages/9781506754901_p0_v1_s90x140.jpg',
      item_price: 2499,
      line_total: 2499,
      name: "Rosalina's Storybook",
      quantity: 1,
      url: 'https://www.barnesandnoble.com/w/rosalinas-storybook-nintendo/1148284276?ean=9781506754901',
    },
  ],
  session_id: 1764532486687,
  store_id: 96,
  store_name: 'Barnes and Noble',
  tenant: 'ebates.com',
  timestamp: 1764547225512,
  toolbarid: 860022833,
  tracking_ticket: 'ebs6152307003sbe',
  url: 'https://www.barnesandnoble.com/checkout/',
};

/**
 * Ancestry - Products with only price (no name/URL)
 */
export const ancestryEvent: RawCartEvent = {
  app_version: '12.22.1',
  application_subtype: 'iPhone',
  application_type: 'App',
  browser_agent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  cart_total: 2900,
  cart_total_qty: 2,
  context_device: {
    id: '5A991E1F-79D0-4C09-B292-68A384527270',
    manufacturer: 'Apple',
    model: 'iPhone12,1',
    name: 'iPhone',
    type: 'ios',
  },
  context_location: {
    latitude: 39.69536867675821,
    longitude: -89.70917619877476,
  },
  context_network: {
    carrier: '--',
    cellular: false,
    wifi: true,
  },
  context_os: {
    name: 'iOS',
    version: '26.1',
  },
  context_timezone: 'America/Chicago',
  created_ts: '1764547392',
  created_ts_ms: '1764547392979',
  currency: 'USD',
  device_ids: {
    idfv: '5A991E1F-79D0-4C09-B292-68A384527270',
    uuid: 'E4FCA699-7589-4B38-92DA-D639263A713E',
  },
  device_platform: 'Smartphone',
  member_guid: '1997876AF711248B8AF3C14',
  os_version: '26.1.0',
  page_url: 'https://www.ancestry.com/checkout/MLI',
  product_list: [
    {
      item_price: 2900,
      line_total: 2900,
      quantity: 1,
    },
    {
      item_price: 100,
      line_total: 100,
      quantity: 1,
    },
  ],
  store_id: '5886', // String store_id from App
  store_name: 'Ancestry.com',
  tenant: 'ebates.com',
  timestamp: 1764547392040,
  tracking_ticket: 'ebs6152619581sbe',
  user_id: '0',
  visit_id: 'C152D0ED-637F-4109-8485-961E7FBB9A5C',
};

/**
 * Ulta - Empty product list
 */
export const ultaEmptyCartEvent: RawCartEvent = {
  app_version: '12.22.1',
  application_subtype: 'iPhone',
  application_type: 'App',
  browser_agent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  cart_total: 3920,
  cart_total_qty: 0,
  context_device: {
    id: 'D0E64C59-C833-4116-8644-0C2A287ABBEB',
    manufacturer: 'Apple',
    model: 'iPhone15,2',
    name: 'iPhone',
    type: 'ios',
  },
  context_timezone: 'America/Los_Angeles',
  currency: 'USD',
  page_url: 'https://www.ulta.com/bag',
  product_list: [],
  store_id: '4207',
  store_name: 'Ulta Beauty',
  tenant: 'ebates.com',
  timestamp: 1764548107122,
  tracking_ticket: 'ebs6152674356sbe',
};

/**
 * Macy's - String store_id with product URLs
 */
export const macysEvent: RawCartEvent = {
  app_version: '12.22.1',
  application_subtype: 'iPhone',
  application_type: 'App',
  browser_agent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  cart_total: 2758,
  cart_total_qty: 3,
  context_device: {
    id: '5629A414-FB35-49F6-B509-A31CF5961D4D',
    manufacturer: 'Apple',
    model: 'iPhone17,1',
    name: 'iPhone',
    type: 'ios',
  },
  currency: 'USD',
  page_url: 'https://www.macys.com/my/bag',
  product_list: [
    {
      image_url:
        'https://slimages.macysassets.com/is/image/MCY/products/4/optimized/34293294_fpx.tif',
      item_price: 1560,
      line_total: 1560,
      name: "Hippie Rose Juniors' Mock-Neck Eyelash-Cable Knit Sweater",
      quantity: 1,
      url: 'https://www.macys.com/shop/product/hippie-rose-juniors-mock-neck-eyelash-cable-knit-sweater?ID=24352629',
    },
    {
      image_url:
        'https://slimages.macysassets.com/is/image/MCY/products/1/optimized/33058994_fpx.tif',
      item_price: 799,
      line_total: 799,
      name: "Charter Club Women's Faux-Fur Ped Slipper Socks, Macy's Exclusive",
      quantity: 1,
      url: 'https://www.macys.com/shop/product/charter-club-womens-faux-fur-ped-slipper-socks-macys-exclusive?ID=21693356',
    },
    {
      image_url:
        'https://slimages.macysassets.com/is/image/MCY/products/4/optimized/33173007_fpx.tif',
      item_price: 399,
      line_total: 399,
      name: "Holiday Lane Women's Holiday Crew Socks, Created for Macy's",
      quantity: 1,
      url: 'https://www.macys.com/shop/product/holiday-lane-womens-holiday-crew-socks-created-for-macys?ID=18187349',
    },
  ],
  store_id: '8333', // String store_id
  store_name: "Macy's",
  tenant: 'ebates.com',
  timestamp: 1764547271264,
  tracking_ticket: 'ebs6152243141sbe',
};

/**
 * Best Buy - Product with price = 0
 */
export const bestBuyEvent: RawCartEvent = {
  app_version: '5.76.1',
  application_subtype: 'Toolbar',
  application_type: 'Toolbar',
  browser: 'Chrome',
  browser_agent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  cart_total: 27615,
  cart_total_qty: 1,
  client: 'toolbar',
  currency: 'USD',
  free_shipping: true,
  page_url: 'https://www.bestbuy.com/cart',
  platform: 'Toolbar',
  product_list: [
    {
      image_url:
        'https://pisces.bbystatic.com/image2//BestBuy_US/images/products/d4e1eecc-937a-48d2-b19f-2e612c94f629.jpg',
      item_price: 0,
      line_total: 0,
      name: 'HP - OfficeJet Pro 9125e Wireless AI-Enabled AiO Inkjet Printer',
      quantity: 1,
      url: 'https://www.bestbuy.com/product/hp-officejet-pro-9125e-wireless-ai-enabled-aio-inkjet-printer-w-3-months-of-instant-ink--1-bonus-month-of-ink-w-code-white/JJGXXFS3TG/sku/6565475',
    },
  ],
  session_id: 1764543964414,
  store_id: 4767,
  store_name: 'Best Buy',
  tenant: 'ebates.com',
  timestamp: 1764548450068,
  toolbarid: 856810600,
  tracking_ticket: 'ebs6152266723sbe',
  url: 'https://www.bestbuy.com/cart',
};

/**
 * Bloomingdale's - Complex URL with query params
 */
export const bloomingdalesEvent: RawCartEvent = {
  app_version: '12.22.1',
  application_subtype: 'iPhone',
  application_type: 'App',
  cart_total: 79999,
  cart_total_qty: 1,
  currency: 'USD',
  page_url: 'https://www.bloomingdales.com/my/bag',
  product_list: [
    {
      image_url:
        'https://images.bloomingdalesassets.com/is/image/BLM/products/9/optimized/11957499_fpx.tif',
      item_price: 79999,
      line_total: 79999,
      name: 'All-Clad D5 Stainless Brushed 5-Ply Bonded 10-Piece Cookware Set',
      quantity: 1,
      url: 'https://www.bloomingdales.com/shop/product/all-clad-d5-stainless-brushed-5-ply-bonded-10-piece-cookware-set?ID=1074049&upc_ID=2011124&Quantity=1&seqNo=3&EXTRA_PARAMETER=BAG&pickInStore=false',
    },
  ],
  store_id: '9376',
  store_name: "Bloomingdale's",
  tenant: 'ebates.com',
  timestamp: 1764547813110,
  tracking_ticket: 'ebs6152407612sbe',
};

/**
 * Lowes - Android app event
 */
export const lowesEvent: RawCartEvent = {
  app_version: '12.22.0',
  application_subtype: 'Android Phone',
  application_type: 'App',
  cart_total: 9497,
  cart_total_qty: 2,
  context_device: {
    adTrackingEnabled: true,
    advertisingId: 'a4d2577c-c5b5-44f4-b740-fcaa1e769bbd',
    id: 'db58714c47283af9a1c46b9a417ee11c9117db5f96d0af0dc3bb0f9c20a28a49',
    manufacturer: 'samsung',
    model: 'SM-S901U',
    name: 'r0q',
    type: 'android',
  },
  context_network: {
    bluetooth: false,
    carrier: 'Verizon ',
    cellular: true,
    wifi: false,
  },
  context_os: {
    name: 'Android',
    version: '16',
  },
  context_timezone: 'America/Los_Angeles',
  currency: 'USD',
  page_url: 'https://www.lowes.com/cart',
  product_list: [
    {
      image_url:
        'https://mobileimages.lowes.com/productimages/2bec6945-8bb2-47ab-bfcd-debb367bc39e/67339738.jpeg',
      item_price: 5999,
      line_total: 5999,
      name: 'everydrop Push-in Refrigerator Water Filter Filter 1',
      quantity: 1,
      url: 'https://www.lowes.com/pd/everydrop-Filter-1-6-Month-Refrigerator-Water-Filter/50352226',
    },
    {
      image_url:
        'https://mobileimages.lowes.com/productimages/fc8dbe0c-bfd5-46da-be0c-ee8fc674b039/63538192.jpg',
      item_price: 3498,
      line_total: 3498,
      name: 'GE Snowflake 8 -Count Sparkling White LED Plug-In Christmas Icicle Lights',
      quantity: 1,
      url: 'https://www.lowes.com/pd/GE-Snowflake-8-Count-Sparkling-White-Snowflake-LED-Plug-In-Christmas-Icicle-Lights/5014121965',
    },
  ],
  store_id: 10722,
  store_name: "Lowe's",
  tenant: 'ebates.com',
  tracking_ticket: 'ebs6152288700sbe',
};

/**
 * Ulta - With product (for testing ID extraction)
 */
export const ultaWithProductEvent: RawCartEvent = {
  app_version: '12.22.1',
  application_subtype: 'iPhone',
  application_type: 'App',
  cart_total: 9200,
  cart_total_qty: 1,
  currency: 'USD',
  page_url: 'https://www.ulta.com/bag',
  product_list: [
    {
      image_url: 'https://media.ulta.com/i/ulta/2583472?w=400&h=400&fmt=auto',
      item_price: 10200,
      line_total: 10200,
      name: 'Very Good Girl Eau de Parfum (Size1.0 oz)',
      quantity: 1,
      url: 'https://www.ulta.com/p/very-good-girl-eau-de-parfum-pimprod2025902?sku=2583472',
    },
  ],
  store_id: '4207',
  store_name: 'Ulta Beauty',
  tenant: 'ebates.com',
  timestamp: 1764548023018,
  tracking_ticket: 'ebs6152594557sbe',
};
