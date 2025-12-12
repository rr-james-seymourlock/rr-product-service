/**
 * Nordstrom Rack Session Fixture - Real user browsing session from iPhone App
 *
 * User browsed lamps and home accessories, then added items to cart.
 * Most cart items were NOT viewed during the session.
 *
 * Key characteristics:
 * - Product URLs use /s/{brand-slug}/{product_id}?... format
 * - Cart URLs use /s/{product_id}?origin=bag format (shortened)
 * - Product IDs are 7-digit numeric (extracted from URL path)
 * - Low match rate (16.7%) - demonstrates realistic session where
 *   many cart items were added from outside the tracked session
 * - No SKUs available in image URLs or product data
 */
import type { CartEnricherFixture, RawCartEvent, RawProductViewEvent } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'nordstromrack-session-001',
  description:
    'iPhone app browsing session with 7 unique product views and 6 cart items (only 1 viewed)',
  storeId: '13349',
  storeName: 'Nordstrom Rack',

  /**
   * Expected matches based on manual analysis:
   * - Only 1 cart item was viewed during the session
   * - Other 5 items were likely added from previous sessions or direct links
   */
  expectedMatches: [
    {
      cartItemName: 'Touch Activated Wireless Lamp',
      productSku: '8219165',
      confidence: 'medium' as const,
      reason: 'extracted_id from cart URL matches product URL ID, plus exact title and price match',
    },
  ],

  /**
   * Raw product view events from the session
   * User browsed lamps and home accessories
   */
  productViews: [
    {
      amount: '33.97',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>A lovely gift for any pet parent (or the perfect pick for your furry friend), this set includes a supersoft plush throw and fluffy faux-shearling pillow.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/dd8898ff-aa39-450d-be3d-ebcc396b4f5e.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/a7fcb33f-3886-4f8f-a25d-ee212fd677a2.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/e1155ff9-6097-48ee-8550-d4cc9bdb1c5f.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/f3eb7b68-d675-49cc-ad7e-3b6721248371.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Pet Plush Throw & Faux Shearling Bone Pillow 2-Piece Set',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/french-connection-pet-plush-throw-faux-shearling-bone-pillow-2-piece-set/8327213?origin=category-personalizedsort&breadcrumb=Home%2FHome%2FPet%20Accessories&color=001',
      created_ts: '1765328073',
    },
    {
      amount: '35.97',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>Create a contemporary aesthetic in your home or office space with this cordless lamp featuring a touch-activated design and convenient charging cord.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/544bb26b-e3b6-49f0-a9e5-56518592f7f1.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/0f638054-ed6d-4aa9-b468-6adfacd6b59a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/ed753fad-c3e1-4684-bcc4-4393321cb99a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/ca4ce9b8-7c92-4377-a012-3d3494dfdd2a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/e4d57318-3f5d-410f-aa95-1c758403e0ff.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Touch Activated Wireless Lamp',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/lalia-home-touch-activated-wireless-lamp/8219165?origin=keywordsearch-personalizedsort&breadcrumb=Home%2FAll%20Results&color=001',
      created_ts: '1765328334',
    },
    {
      amount: '32.97',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>Give your space the perfect ambiance with this touch-activated desk lamp featuring four touch control settings for multiple lighting options.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/5a74abc5-2f26-4c8d-a1b4-9a42829636ca.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/bec40392-f458-448b-9552-0bcd064ae466.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/b7fa0791-a76c-4502-8e1f-8af71169bc3d.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/5228c218-e29c-48da-9662-a9fada0283ba.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/77083b84-f1b1-4c79-977b-3423ff5a8a68.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Touch Sensor Desk Lamp',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/lalia-home-touch-sensor-desk-lamp/8616033?origin=keywordsearch-personalizedsort&breadcrumb=Home%2FAll%20Results&color=710',
      created_ts: '1765328470',
    },
    {
      amount: '32.97',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>Give your space the perfect ambiance with this touch-activated desk lamp featuring four touch control settings for multiple lighting options.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/8bdbc39a-83fa-4950-aeac-18327ab2cd22.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/db8c4738-bfe5-4cc4-84e8-3242b66702f1.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/57249e28-d9f0-43ba-8206-bcadb98521f2.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/589deb63-73d0-4055-8a43-7170c417a8c7.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/f382e2ee-f665-4ea4-a3bf-9995204d9fb5.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Touch Sensor Desk Lamp',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/lalia-home-touch-sensor-desk-lamp/8616029?origin=keywordsearch-personalizedsort&breadcrumb=Home%2FAll%20Results&color=041',
      created_ts: '1765328514',
    },
    {
      amount: '19.97',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>A sleek table lamp easily recharges to illuminate your favorite corner of any room of your home.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/f5da34d4-7a91-46b2-8141-39a8e3981d73.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/544bb26b-e3b6-49f0-a9e5-56518592f7f1.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/0f638054-ed6d-4aa9-b468-6adfacd6b59a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/ed753fad-c3e1-4684-bcc4-4393321cb99a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/ca4ce9b8-7c92-4377-a012-3d3494dfdd2a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/e4d57318-3f5d-410f-aa95-1c758403e0ff.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Rechargeable Table Lamp',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/rechargeable-table-lamp/8349707?origin=coordinating-8349707-0-1-ProductPage1_ihs_exp-recbot-also_viewed_graph_rack&recs_placement=ProductPage1_ihs_exp&recs_strategy=also_viewed_graph_rack&recs_source=recbot&recs_page_type=product&recs_seed=8219165&color=BLACK',
      created_ts: '1765328619',
    },
    {
      amount: '19.97',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>Add a warm ambiance to your space with this sleek, rechargeable table lamp featuring a domed shade.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/1d2dbacb-0f6f-4dd8-a784-4fa7e62733b7.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/12546507-4b29-4114-8627-13ac738dbe8e.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/544bb26b-e3b6-49f0-a9e5-56518592f7f1.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/0f638054-ed6d-4aa9-b468-6adfacd6b59a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/ed753fad-c3e1-4684-bcc4-4393321cb99a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/ca4ce9b8-7c92-4377-a012-3d3494dfdd2a.jpeg?trim=color&w=350&h=536',
        'https://n.nordstrommedia.com/it/e4d57318-3f5d-410f-aa95-1c758403e0ff.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Rechargeable Table Lamp',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/luze-rechargeable-table-lamp/8412190?origin=coordinating-8412190-0-3-ProductPage1_ihs_exp-recbot-also_viewed_graph_rack&recs_placement=ProductPage1_ihs_exp&recs_strategy=also_viewed_graph_rack&recs_source=recbot&recs_page_type=product&recs_seed=8219165&color=BLACK',
      created_ts: '1765328659',
    },
    {
      amount: '29.99',
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      currency: 'USD',
      description:
        '<p>Refresh your kitchen essentials with this set of stainless steel whisks featured in two differing sizes for versatile use. A simple push-top design starts the rotating motion instantly for quick and easy use.</p>',
      image_url_list: [
        'https://n.nordstrommedia.com/it/a1105f69-6614-4d10-9ad2-357a25a71ca0.jpeg?trim=color&w=350&h=536',
      ],
      name: 'Essentials 2-Piece Whisk Set',
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      url: 'https://www.nordstromrack.com/s/berghoff-international-essentials-2-piece-whisk-set/8189031?origin=coordinating-8189031-0-5-ShoppingBag1-recbot-also_viewed_graph_rack&recs_placement=ShoppingBag1&recs_strategy=also_viewed_graph_rack&recs_source=recbot&recs_page_type=shopping_bag&recs_seed=8219165&color=BLACK',
      created_ts: '1765328700',
    },
  ] as RawProductViewEvent[],

  /**
   * Raw cart events from the session
   * Final cart state with 6 items (only 1 was viewed)
   */
  cartEvents: [
    {
      app_version: '12.23.1',
      application_subtype: 'iPhone',
      application_type: 'App',
      cart_total: 14838,
      cart_total_qty: 6,
      currency: 'USD',
      product_list: [
        {
          image_url:
            'https://n.nordstrommedia.com/it/544bb26b-e3b6-49f0-a9e5-56518592f7f1.jpeg?w=156&h=240',
          item_price: 3597,
          line_total: 3597,
          name: 'Touch Activated Wireless Lamp',
          quantity: 1,
          url: 'https://www.nordstromrack.com/s/8219165?origin=bag',
        },
        {
          image_url:
            'https://n.nordstrommedia.com/it/d33cba06-c17e-439b-aa66-563215f5e29b.jpeg?w=156&h=240',
          item_price: 1697,
          line_total: 1697,
          name: 'Crewneck T-Shirt & Leggings Set',
          quantity: 1,
          url: 'https://www.nordstromrack.com/s/8385326?origin=bag',
        },
        {
          image_url:
            'https://n.nordstrommedia.com/it/bc9756f7-d592-4151-9713-3d46583a7df8.jpeg?w=156&h=240',
          item_price: 1997,
          line_total: 1997,
          name: "Kids' Knit Sweater",
          quantity: 1,
          url: 'https://www.nordstromrack.com/s/8432660?origin=bag',
        },
        {
          image_url:
            'https://n.nordstrommedia.com/it/fbadae2b-08ec-4e5e-a141-81a4d860ed0c.jpeg?w=156&h=240',
          item_price: 1297,
          line_total: 1297,
          name: "Kids' Sport Print Hooded Long Sleeve T-Shirt",
          quantity: 1,
          url: 'https://www.nordstromrack.com/s/8632932?origin=bag',
        },
        {
          image_url:
            'https://n.nordstrommedia.com/it/0589a477-64f6-4714-bfae-301f313be453.jpeg?w=156&h=240',
          item_price: 2997,
          line_total: 2997,
          name: 'Roberto 4-Piece Hostess Serving Set',
          quantity: 1,
          url: 'https://www.nordstromrack.com/s/8354148?origin=bag',
        },
        {
          image_url:
            'https://n.nordstrommedia.com/it/56a2df8b-9530-418c-ba03-1c5449857feb.jpeg?w=156&h=240',
          item_price: 1997,
          line_total: 1997,
          name: 'Clifton 4-Piece Hostess Serving Set',
          quantity: 1,
          url: 'https://www.nordstromrack.com/s/8354143?origin=bag',
        },
      ],
      store_id: '13349',
      store_name: 'Nordstrom Rack',
      created_ts: '1765328781',
    },
  ] as RawCartEvent[],
};

export default fixture;
