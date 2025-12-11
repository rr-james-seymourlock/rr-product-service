/**
 * Gymshark Session Fixture - Real user browsing session
 *
 * User browsed various Gymshark products on iOS app, viewed multiple color variants,
 * then added 4 items to cart.
 *
 * Key characteristics:
 * - Cart items have color appended to title (e.g., "Sport Cap - White")
 * - Product views have color in separate field
 * - SKUs are embedded in image URLs
 * - Same base SKU for color variants (e.g., A2A1J for all Arrival T-Shirt colors)
 */
import type { RawCartEvent, RawProductViewEvent } from './types.js';

export const fixture = {
  name: 'gymshark-session-001',
  description: 'iOS app browsing session with 41 product views and 4 cart items',
  storeId: '15861',
  storeName: 'Gymshark',

  /**
   * Expected matches based on manual analysis:
   * - All 4 cart items were viewed
   * - Matching via SKU embedded in image URLs
   */
  expectedMatches: [
    {
      cartItemName: 'Sport Cap - White',
      productSku: 'I3A6W',
      confidence: 'high' as const,
      reason: 'SKU I3A6W in image URL matches product SKU',
    },
    {
      cartItemName: 'Crest Joggers - Navy',
      productSku: 'A2A4H',
      confidence: 'high' as const,
      reason: 'SKU A2A4H in image URL matches product SKU',
    },
    {
      cartItemName: 'Arrival Block 6" Shorts - Black',
      productSku: 'A3B9Y',
      confidence: 'high' as const,
      reason: 'SKU A3B9Y in image URL matches product SKU',
    },
    {
      cartItemName: 'Arrival T-Shirt - Black',
      productSku: 'A2A1J',
      confidence: 'high' as const,
      reason: 'SKU A2A1J in image URL matches product SKU',
    },
  ],

  /**
   * Raw product view events from the session
   */
  productViews: [
    {
      amount: '30',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['Black'],
      currency: 'USD',
      description:
        "PROGRESS MADE DAILYMade with essential performance technology, Arrival is built to make progress in, whether it's advancing your conditioning or pushing for that extra mile. Sweat-wicking tech to keep you cool &amp;amp; dry when you're on the move Crafted from comfortable lightweight materials Contrast panels &amp;amp; piping Internal drawcord waist to get the right fit SIZE &amp;amp; FIT Slim fit Model is 5'11\" and wears size M MATERIALS &amp;amp; CARE100% Recycled PolyesterSKU: A3B9Y-BB2J",
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/images-ArrivalGoodLevelNewnessshortGSBlackA3B9Y_BB2J_1279.jpg?v=1753986811',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Arrival Block 6" Shorts',
      offer_list: [{ offer_amount: '30', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.5'],
      sku_list: ['A3B9Y'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-arrival-block-6-shorts-shorts-black-aw25',
      created_ts: '1765324917',
    },
    {
      amount: '30',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['Cherry Purple'],
      currency: 'USD',
      description:
        "PROGRESS MADE DAILYMade with essential performance technology, Arrival is built to make progress in, whether it's advancing your conditioning or pushing for that extra mile. Sweat-wicking tech to keep you cool &amp;amp; dry when you're on the move Crafted from comfortable lightweight materials Contrast panels &amp;amp; piping Internal drawcord waist to get the right fit SIZE &amp;amp; FIT Slim fit Model is 5'11\" and wears size M MATERIALS &amp;amp; CARE100% Recycled PolyesterSKU: A3B9Y-PCDS",
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/images-ArrivalGoodLevelNewnessshortGSCherryPurpleA3B9Y_PCDS_2817_V1.jpg?v=1753986838',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Arrival Block 6" Shorts',
      offer_list: [{ offer_amount: '30', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.5'],
      sku_list: ['A3B9Y'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-arrival-block-6-shorts-shorts-purple-aw25',
      created_ts: '1765324920',
    },
    {
      amount: '22',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['Navy'],
      currency: 'USD',
      description:
        "REDEFINING YOUR POTENTIAL Created to encourage you to aspire more and achieve more, Arrival has everything you'll need to reach your conditioning goals. • Sweat-wicking tech to keep you cool and dry• Lightweight material for minimal distractions &amp;amp; full focus SIZE &amp;amp; FIT• Regular fit• Set-in sleeves• Model is 5'11\" and wears a size M MATERIALS &amp;amp; CARE• 100% Polyester SKU: A2A1J-UBCY",
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/ArrivalRegularFitT-ShirtNavyA2A1J-UBCY-4048_A.jpg?v=1747817866',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Arrival T-Shirt',
      offer_list: [{ offer_amount: '22', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.1'],
      sku_list: ['A2A1J'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-arrival-regular-fit-t-shirt-navy-ss22',
      created_ts: '1765325018',
    },
    {
      amount: '22',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['Black'],
      currency: 'USD',
      description:
        "REDEFINING YOUR POTENTIAL The Arrival Regular Fit T-Shirt has all the performance of the original, with a little extra freedom to move. With all the fundamental features you need to perform your best - including sweat-wicking capabilities, perforated fabrics and near-weightless fits - we've just increased the sizing for a more casual look and spacious fit. - Regular fit- Lightweight material- Sweat-wicking- Straight hem- Set-in sleeves and crew neck- Heat-sealed Gymshark logo to chest- 100% Polyester- Model is 5'11\" and wears a size M- SKU: A2A1J-BBBB",
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/ArrivalRegularFitT-ShirtBlackA2A1J-BBBB-4049_A.jpg?v=1747817865',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Arrival T-Shirt',
      offer_list: [{ offer_amount: '22', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.1'],
      sku_list: ['A2A1J'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-arrival-regular-fit-t-shirt-black-ss22',
      created_ts: '1765325023',
    },
    {
      amount: '38',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['Navy'],
      currency: 'USD',
      description:
        'REST DAY THE CREST WAY Consistently comfortable and casually stylish, you can wear Crest anywhere and pair it with anything. • Durable embroidered logo that\'ll last through every wear• Soft, brushed back fabric inside for full comfort• Drawcord waist for an adjustable fit• Side pockets and popper button to back pocket for storage SIZE &amp;amp; FIT• Slim fit• 28" inseam based on size M• Model is 6\'0" and wears size M MATERIALS &amp;amp; CARE• 80% Cotton, 20% PolyesterSKU: A2A4H-UBCY',
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/CrestJoggersNavyA2A4H-UBCY-0275.jpg?v=1710776678',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Crest Joggers',
      offer_list: [{ offer_amount: '38', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.1'],
      sku_list: ['A2A4H'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-crest-joggers-navy-ss22',
      created_ts: '1765325283',
    },
    {
      amount: '38',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['Archive Brown'],
      currency: 'USD',
      description:
        "CONSISTENTLY COMFORTABLE, CASUALLY STYLISHVersatile designs made from soft, durable fabrics mean you can wear Crest anywhere and pair it with anything. So if comfort's your goal, Crest's your new go-to. Durable, soft cotton-based fabric Versatile design &amp;amp; colours make it great for gym or rest day Durable embroidered logo lasts through every wear Adjustable external drawcord waist Store your stuff with side pockets &amp;amp; a back pocket with a popper button Comfortable &amp;amp; warm with soft, brushed back fleece inside SIZE &amp;amp; FIT Slim fit Regular length Model is 5'11\" and wears size M MATERIALS &amp;amp; CARE 80% Cotton, 20% Recycled Polyester 285gsm SKU: A2A4H-NBY8",
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/images-CrestPantGSArchiveBrownA2A4H_NBY8_4184_V1.jpg?v=1756284231',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Crest Joggers',
      offer_list: [{ offer_amount: '38', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.1'],
      sku_list: ['A2A4H'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-crest-joggers-pants-brown-aw25',
      created_ts: '1765325290',
    },
    {
      amount: '9',
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      color_list: ['White'],
      currency: 'USD',
      description:
        'WORK FOR THE REWARD Sport is here to support you through every rep, step and HIIT session, so you can focus on what matters most. Working for that reward. • Soft silhouette for a comfy wear• Adjust the fit with the strap at the back • Stitched eyelet detailing • Branded metal logo on the front panel SIZE &amp;amp; FIT • One size • Wear it on your head MATERIALS &amp;amp; CARE • 97% Polyester , 3% Elastane SKU: I3A6W-WB57',
      gtin_list: [],
      image_url_list: [
        'https://cdn.shopify.com/s/files/1/0156/6146/files/SportCapGSWhiteI3A6W-WB5795051.jpg?v=1743792747',
      ],
      member_guid: '13558ECBF058641368C5008',
      model_list: [],
      mpn_list: [],
      name: 'Sport Cap',
      offer_list: [{ offer_amount: '9', offer_currency: 'USD' }],
      productid_list: [],
      rating: ['4.7'],
      sku_list: ['I3A6W'],
      store_id: '15861',
      store_name: 'Gymshark',
      url: 'https://www.gymshark.com/products/gymshark-sport-cap-white-aw24',
      created_ts: '1765325437',
    },
  ] as RawProductViewEvent[],

  /**
   * Raw cart events from the session (using first one, all have same items)
   */
  cartEvents: [
    {
      app_version: '12.22.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      cart_total: 9900,
      cart_total_qty: 4,
      currency: 'USD',
      member_guid: '13558ECBF058641368C5008',
      page_url: 'https://us.checkout.gymshark.com/checkouts/cn/hWN6FWyYO352S1KA2dfuS6F8/en-us',
      product_list: [
        {
          image_url:
            'https://cdn.shopify.com/s/files/1/0156/6146/files/SportCapGSWhiteI3A6W-WB5795051_64x64.jpg?v=1743792747',
          item_price: 900,
          line_total: 900,
          name: 'Sport Cap - White',
          quantity: 1,
        },
        {
          image_url:
            'https://cdn.shopify.com/s/files/1/0156/6146/files/CrestJoggersNavyA2A4H-UBCY-0275_64x64.jpg?v=1710776678',
          item_price: 3800,
          line_total: 3800,
          name: 'Crest Joggers - Navy',
          quantity: 1,
        },
        {
          image_url:
            'https://cdn.shopify.com/s/files/1/0156/6146/files/images-ArrivalGoodLevelNewnessshortGSBlackA3B9Y_BB2J_1279_64x64.jpg?v=1753986811',
          item_price: 3000,
          line_total: 3000,
          name: 'Arrival Block 6" Shorts - Black',
          quantity: 1,
        },
        {
          image_url:
            'https://cdn.shopify.com/s/files/1/0156/6146/files/ArrivalRegularFitT-ShirtBlackA2A1J-BBBB-4049_A_64x64.jpg?v=1747817865',
          item_price: 2200,
          line_total: 2200,
          name: 'Arrival T-Shirt - Black',
          quantity: 1,
        },
      ],
      store_id: '15861',
      store_name: 'Gymshark',
      created_ts: '1765325513',
    },
  ] as RawCartEvent[],
};

export default fixture;
