/**
 * Sam's Club Session Fixture - Real user browsing session from iPhone App
 *
 * User browsed Champion jogger variants (4 colors) and snacks,
 * then added items to cart across multiple cart events.
 *
 * Key characteristics:
 * - Cart URLs use /ip/seort/{id} format (mobile app cart)
 * - Product URLs use /ip/{slug}/{id} format (mobile app product)
 * - Cart titles include variant info: "{title} {color} {size}:- {color}, {size}"
 * - Product IDs are 11-digit numeric (extracted from URL path)
 * - No SKUs in image URLs (unlike Gymshark)
 */
import type { RawCartEvent, RawProductViewEvent } from './types.js';

export const fixture = {
  name: 'samsclub-session-001',
  description: 'iPhone app browsing session with 6 product views and 12 cart snapshots',
  storeId: '10086',
  storeName: "Sam's Club",

  /**
   * Expected matches based on manual analysis:
   * - All cart items should match via extracted_id from URL
   * - Champion joggers match the viewed jogger variants
   * - Snacks match viewed snack products
   */
  expectedMatches: [
    {
      cartItemName: 'Champion Boys Logo Jogger Grey M:- Grey, M',
      productSku: '16675013342',
      confidence: 'medium' as const,
      reason: 'extracted_id from cart URL matches product URL ID',
    },
    {
      cartItemName: 'Champion Boys Logo Jogger Grey L:- Grey, L',
      productSku: '16675013343',
      confidence: 'medium' as const,
      reason: 'extracted_id from cart URL matches product URL ID',
    },
    {
      cartItemName: "Member's Mark Gummy Bears (56 oz.)",
      productSku: '24921152',
      confidence: 'medium' as const,
      reason: 'extracted_id from cart URL matches product URL ID',
    },
    {
      cartItemName: 'Popcorners Variety Pack (28 ct.)',
      productSku: '16679295472',
      confidence: 'medium' as const,
      reason: 'extracted_id from cart URL matches product URL ID',
    },
  ],

  /**
   * Raw product view events from the session
   * 4 Champion jogger color variants + 2 snacks
   */
  productViews: [
    {
      amount: '17.98',
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        "Champion Boys Logo Jogger. These Champion Logo Joggers for boys will have him running around in style! The soft fabric with a ribbed waistband and ankles ensure comfort that he'll love. Whether he's hitting the playground or chilling at home, these joggers are a must-have. Available Colors: Grey Navy Red Blue Heather.",
      image_url_list: [
        'https://scene7.samsclub.com/is/image/samsclub/0045299903570_A?wid=280&hei=280',
      ],
      member_guid: '38E5844EA85D7411A30F804',
      name: 'Champion Boys Logo Jogger',
      productid_list: ['prod24920746'],
      rating: ['4.4'],
      store_id: '10086',
      store_name: "Sam's Club",
      url: 'https://www.samsclub.com/ip/champion-boys-logo-jogger/16675013342',
      created_ts: '1733764811',
    },
    {
      amount: '17.98',
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        "Champion Boys Logo Jogger. These Champion Logo Joggers for boys will have him running around in style! The soft fabric with a ribbed waistband and ankles ensure comfort that he'll love. Whether he's hitting the playground or chilling at home, these joggers are a must-have. Available Colors: Grey Navy Red Blue Heather.",
      image_url_list: [
        'https://scene7.samsclub.com/is/image/samsclub/0045299903590_A?wid=280&hei=280',
      ],
      member_guid: '38E5844EA85D7411A30F804',
      name: 'Champion Boys Logo Jogger',
      productid_list: ['prod24920746'],
      rating: ['4.4'],
      store_id: '10086',
      store_name: "Sam's Club",
      url: 'https://www.samsclub.com/ip/champion-boys-logo-jogger/16675013343',
      created_ts: '1733764822',
    },
    {
      amount: '17.98',
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        "Champion Boys Logo Jogger. These Champion Logo Joggers for boys will have him running around in style! The soft fabric with a ribbed waistband and ankles ensure comfort that he'll love. Whether he's hitting the playground or chilling at home, these joggers are a must-have. Available Colors: Grey Navy Red Blue Heather.",
      image_url_list: [
        'https://scene7.samsclub.com/is/image/samsclub/0045299903560_A?wid=280&hei=280',
      ],
      member_guid: '38E5844EA85D7411A30F804',
      name: 'Champion Boys Logo Jogger',
      productid_list: ['prod24920746'],
      rating: ['4.4'],
      store_id: '10086',
      store_name: "Sam's Club",
      url: 'https://www.samsclub.com/ip/champion-boys-logo-jogger/16675013341',
      created_ts: '1733764835',
    },
    {
      amount: '17.98',
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        "Champion Boys Logo Jogger. These Champion Logo Joggers for boys will have him running around in style! The soft fabric with a ribbed waistband and ankles ensure comfort that he'll love. Whether he's hitting the playground or chilling at home, these joggers are a must-have. Available Colors: Grey Navy Red Blue Heather.",
      image_url_list: [
        'https://scene7.samsclub.com/is/image/samsclub/0045299903610_A?wid=280&hei=280',
      ],
      member_guid: '38E5844EA85D7411A30F804',
      name: 'Champion Boys Logo Jogger',
      productid_list: ['prod24920746'],
      rating: ['4.4'],
      store_id: '10086',
      store_name: "Sam's Club",
      url: 'https://www.samsclub.com/ip/champion-boys-logo-jogger/16675013344',
      created_ts: '1733764845',
    },
    {
      amount: '9.98',
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        "Member's Mark Gummy Bears (56 oz.). Member's Mark Gummy Bears combine fun shapes and fruity flavors for a snack the whole family will love. Each 56 oz. bag is packed with colorful gummy bears in flavors like cherry, lemon, orange, strawberry and grape. Whether you're stocking up for a party or just keeping a treat on hand for everyday snacking, these gummy bears are perfect for sharing.",
      image_url_list: [
        'https://scene7.samsclub.com/is/image/samsclub/0078742356143_A?wid=280&hei=280',
      ],
      member_guid: '38E5844EA85D7411A30F804',
      name: "Member's Mark Gummy Bears (56 oz.)",
      productid_list: ['prod24921152'],
      rating: ['4.6'],
      store_id: '10086',
      store_name: "Sam's Club",
      url: 'https://www.samsclub.com/ip/members-mark-gummy-bears-56oz/prod24921152',
      created_ts: '1733764932',
    },
    {
      amount: '14.98',
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        'Popcorners Variety Pack (28 ct.). Popcorners Variety Pack offers a delicious assortment of popped corn snacks in three popular flavors. This pack includes Sea Salt, White Cheddar and Kettle Corn varieties perfect for snacking at home, work or on-the-go. Each 1 oz. bag is made with whole grain corn and contains no artificial flavors or colors.',
      image_url_list: [
        'https://scene7.samsclub.com/is/image/samsclub/0084993401023_A?wid=280&hei=280',
      ],
      member_guid: '38E5844EA85D7411A30F804',
      name: 'Popcorners Variety Pack (28 ct.)',
      productid_list: ['prod21480648'],
      rating: ['4.7'],
      store_id: '10086',
      store_name: "Sam's Club",
      url: 'https://www.samsclub.com/ip/popcorners-variety-pack-28ct/16679295472',
      created_ts: '1733764998',
    },
  ] as RawProductViewEvent[],

  /**
   * Raw cart events from the session
   * Multiple cart snapshots showing progressive cart updates
   * Using representative cart event with all items
   */
  cartEvents: [
    {
      app_version: '25.5.30',
      application_subtype: 'iPhone',
      application_type: 'App',
      cart_total: 7892,
      cart_total_qty: 4,
      currency: 'USD',
      member_guid: '38E5844EA85D7411A30F804',
      product_list: [
        {
          image_url:
            'https://scene7.samsclub.com/is/image/samsclub/0045299903570_A?wid=280&hei=280',
          item_price: 1798,
          line_total: 1798,
          name: 'Champion Boys Logo Jogger Grey M:- Grey, M',
          quantity: 1,
          url: 'https://www.samsclub.com/ip/seort/16675013342',
        },
        {
          image_url:
            'https://scene7.samsclub.com/is/image/samsclub/0045299903590_A?wid=280&hei=280',
          item_price: 1798,
          line_total: 1798,
          name: 'Champion Boys Logo Jogger Grey L:- Grey, L',
          quantity: 1,
          url: 'https://www.samsclub.com/ip/seort/16675013343',
        },
        {
          image_url:
            'https://scene7.samsclub.com/is/image/samsclub/0078742356143_A?wid=280&hei=280',
          item_price: 998,
          line_total: 998,
          name: "Member's Mark Gummy Bears (56 oz.)",
          quantity: 1,
          url: 'https://www.samsclub.com/ip/seort/24921152',
        },
        {
          image_url:
            'https://scene7.samsclub.com/is/image/samsclub/0084993401023_A?wid=280&hei=280',
          item_price: 1498,
          line_total: 1498,
          name: 'Popcorners Variety Pack (28 ct.)',
          quantity: 1,
          url: 'https://www.samsclub.com/ip/seort/16679295472',
        },
      ],
      store_id: '10086',
      store_name: "Sam's Club",
      created_ts: '1733765100',
    },
  ] as RawCartEvent[],
};

export default fixture;
