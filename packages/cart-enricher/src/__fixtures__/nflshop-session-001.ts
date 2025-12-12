/**
 * NFL Shop Session Fixture - Fanatics-powered store with 100% match rate
 *
 * User browsed New England Patriots merchandise and added 4 items to cart.
 * All cart items were viewed, demonstrating URL-based matching for Fanatics stores.
 *
 * Key characteristics:
 * - Fanatics URL pattern: /t-{slug}+p-{longId}+z-{variant}
 * - Image URLs contain product ID: _p-{productId}+ or _ss5_p-{productId}+
 * - productid_list contains explicit product IDs
 * - No SKUs in data (empty sku_list)
 * - Matches primarily via URL (exact match) and extracted_id
 *
 * Expected match rate: 100% (4/4 items)
 * Match methods: url (medium confidence) + extracted_id (medium) + title (low)
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'nflshop-session-001',
  description: 'NFL Shop iOS app session with 4 cart items, all viewed, 100% match rate',
  storeId: '9385',
  storeName: 'NFL Shop',

  /**
   * Expected matches based on manual analysis:
   * - All 4 cart items should match via URL (identical URLs between cart and product views)
   * - Also match via extracted_id (long numeric ID in URL path)
   * - Title matching provides additional low-confidence signal
   */
  expectedMatches: [
    {
      cartItemName:
        "Men's New England Patriots Cutter & Buck Heather Royal Peshastin Eco Fleece Tri-Blend Raglan Recycled Quarter-Zip Jacket",
      productSku: '202093909',
      confidence: 'medium' as const,
      reason: 'URL exact match, extracted_id match from +p-{id}+ pattern',
    },
    {
      cartItemName:
        "Men's New England Patriots Nike Silver 2025 Rivalries Collection Slub Dri-FIT T-Shirt",
      productSku: '202659210',
      confidence: 'medium' as const,
      reason: 'URL exact match, extracted_id match from +p-{id}+ pattern',
    },
    {
      cartItemName:
        "Men's New England Patriots Cutter & Buck Navy Mainsail Sweater Knit Fleece Full-Zip Vest",
      productSku: '3705392',
      confidence: 'medium' as const,
      reason: 'URL exact match, extracted_id match from +p-{id}+ pattern',
    },
    {
      cartItemName:
        "Men's New England Patriots Cutter & Buck Heather Royal Throwback Logo Mainsail Sweater-Knit Full-Zip Vest",
      productSku: '5168837',
      confidence: 'medium' as const,
      reason: 'URL exact match, extracted_id match from +p-{id}+ pattern',
    },
  ],

  /**
   * Raw product view events from the session (deduplicated)
   * User viewed 13 products total, 10 unique - we include the 6 relevant for cart matching
   */
  productViews: [
    {
      amount: '66.49',
      currency: 'USD',
      description:
        'Get ready for game day with this New England Patriots Peshastin Eco Fleece Tri-Blend Raglan Recycled Quarter-Zip Jacket from Cutter & Buck. This eco-friendly piece of gear is made from recycled materials and features innovative grid-back brushed fleece fabric for enhanced breathability and comfort. With UPF 50+ protection and moisture-wicking technology, you can stay cool, dry, and comfortable while showing your New England Patriots pride.',
      image_url_list: [
        'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-heather-royal-new-england-patriots-peshastin-eco-fleece-tri-blend-raglan-recycled-quarter-zip-jacket_ss5_p-202093909+u-jk2kkiigedw6do2vklea+v-z3bweprnde2wuaz9eckn.jpg?_hv=2&w=600',
      ],
      name: "Men's New England Patriots Cutter & Buck Heather Royal Peshastin Eco Fleece Tri-Blend Raglan Recycled Quarter-Zip Jacket",
      productid_list: ['202093909'],
      rating: [],
      sku_list: [],
      mpn_list: [],
      gtin_list: [],
      store_id: '9385',
      store_name: 'NFL Shop',
      url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-heather-royal-peshastin-eco-fleece-tri-blend-raglan-recycled-quarter-zip-jacket/t-25047074+p-466657226536106+z-9-3725956803',
    },
    {
      amount: '33.74',
      currency: 'USD',
      description:
        'The New England Patriots 2025 Rivalries Collection Slub Dri-FIT T-Shirt from Nike is inspired by harsh elements and historic runs. Printed details feature six stars representing the six states and six rings that cement their legacy. Lightweight cotton-polyester material combined with sweat-wicking technology helps keep you cool and dry in this exclusive team tee.',
      image_url_list: [
        'https://fanatics.frgimages.com/new-england-patriots/mens-nike-silver-new-england-patriots-2025-rivalries-collection-slub-dri-fit-t-shirt_ss5_p-202659210+u-ftdmjhogosaqyr7wy328+v-g3ueluiyf2gfehhwisxi.jpg?_hv=2&w=600',
      ],
      name: "Men's New England Patriots Nike Silver 2025 Rivalries Collection Slub Dri-FIT T-Shirt",
      productid_list: ['202659210'],
      rating: [],
      sku_list: [],
      mpn_list: [],
      gtin_list: [],
      store_id: '9385',
      store_name: 'NFL Shop',
      url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-nike-silver-2025-rivalries-collection-slub-dri-fit-t-shirt/t-58047029+p-68221395724282+z-8-1663590900',
    },
    {
      amount: '62.99',
      currency: 'USD',
      description:
        'Rep your New England Patriots pride with this Throwback Roam Recycled Raglan Pullover Sweatshirt from Cutter & Buck. Crafted from a blend of recycled materials, this lightweight sweatshirt is as eco-friendly as it is comfortable, keeping you warm without weighing you down. The durable water-repellent finish offers protection in misty conditions, while the embroidered New England Patriots graphic proudly displays your team allegiance.',
      image_url_list: [
        'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-black-new-england-patriots-throwback-roam-recycled-raglan-pullover-sweatshirt_ss5_p-203176898+u-ppa6wvjbfyqh1cmoebtd+v-l1uqf9m49nsh7i7z5ogo.jpg?_hv=2&w=600',
      ],
      name: "Men's New England Patriots Cutter & Buck Black Throwback Roam Recycled Raglan Pullover Sweatshirt",
      productid_list: ['203176898'],
      rating: [],
      sku_list: [],
      mpn_list: [],
      gtin_list: [],
      store_id: '9385',
      store_name: 'NFL Shop',
      url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-black-throwback-roam-recycled-raglan-pullover-sweatshirt/t-14269229+p-684492019640917+z-9-2972588559',
    },
    {
      amount: '90.99',
      currency: 'USD',
      description:
        "Stay warm and show your New England Patriots pride with this Cutter & Buck Mainsail Sweater Knit Fleece Full-Zip Vest. This vest features embroidered New England Patriots graphics and a brushed fleece interior for warmth. The tonal satin top stitching and frost welt zippered pockets add a touch of style to this comfortable piece. This vest is a must-have for any true Patriots fan, whether you're cheering them on at Gillette Stadium or watching from home.",
      image_url_list: [
        'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-navy-new-england-patriots-mainsail-sweater-knit-fleece-full-zip-vest_pi3705000_ff_3705392-e4b2858dada222862d57_full.jpg?_hv=2&w=600',
      ],
      name: "Men's New England Patriots Cutter & Buck Navy Mainsail Sweater Knit Fleece Full-Zip Vest",
      productid_list: ['3705392'],
      rating: [],
      sku_list: [],
      mpn_list: [],
      gtin_list: [],
      store_id: '9385',
      store_name: 'NFL Shop',
      url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-navy-mainsail-sweater-knit-fleece-full-zip-vest/t-25045874+p-704177835812+z-8-1307168178',
    },
    {
      amount: '90.99',
      currency: 'USD',
      description:
        "Celebrate your New England Patriots pride with this Cutter & Buck Throwback Logo Mainsail Sweater-Knit Full-Zip Vest. This lightweight vest features a sweater knit fabric exterior with a brushed fleece interior, making it perfect for mild temperatures. The embroidered New England Patriots graphics and CB Pennant embroidery on the back collar show off your team spirit. Whether you're cheering on the Patriots from Gillette Stadium or watching from home, this vest will keep you warm and stylish all season long.",
      image_url_list: [
        'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-heather-royal-new-england-patriots-throwback-logo-mainsail-sweater-knit-full-zip-vest_pi5168000_ff_5168837-5ecb4769be79a6d6158c_full.jpg?_hv=2&w=600',
      ],
      name: "Men's New England Patriots Cutter & Buck Heather Royal Throwback Logo Mainsail Sweater-Knit Full-Zip Vest",
      productid_list: ['5168837'],
      rating: [],
      sku_list: [],
      mpn_list: [],
      gtin_list: [],
      store_id: '9385',
      store_name: 'NFL Shop',
      url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-heather-royal-throwback-logo-mainsail-sweater-knit-full-zip-vest/t-36938174+p-2789840819250+z-9-2030223376',
    },
  ],

  /**
   * Raw cart events from the session
   * Cart evolved from 1→2→3→4→5→5→4→4 items. Final snapshot has 4 items.
   */
  cartEvents: [
    {
      cart_total: 39996,
      cart_total_qty: 4,
      currency: 'USD',
      product_list: [
        {
          image_url:
            'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-heather-royal-new-england-patriots-peshastin-eco-fleece-tri-blend-raglan-recycled-quarter-zip-jacket_ss5_p-202093909+u-jk2kkiigedw6do2vklea+v-z3bweprnde2wuaz9eckn.jpg?_hv=2&w=180',
          item_price: 6649,
          line_total: 6649,
          name: "Men's New England Patriots Cutter & Buck Heather Royal Peshastin Eco Fleece Tri-Blend Raglan Recycled Quarter-Zip Jacket",
          quantity: 1,
          url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-heather-royal-peshastin-eco-fleece-tri-blend-raglan-recycled-quarter-zip-jacket/t-25047074+p-466657226536106+z-9-3725956803',
        },
        {
          image_url:
            'https://fanatics.frgimages.com/new-england-patriots/mens-nike-silver-new-england-patriots-2025-rivalries-collection-slub-dri-fit-t-shirt_ss5_p-202659210+u-ftdmjhogosaqyr7wy328+v-g3ueluiyf2gfehhwisxi.jpg?_hv=2&w=180',
          item_price: 4499,
          line_total: 4499,
          name: "Men's New England Patriots Nike Silver 2025 Rivalries Collection Slub Dri-FIT T-Shirt",
          quantity: 1,
          url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-nike-silver-2025-rivalries-collection-slub-dri-fit-t-shirt/t-58047029+p-68221395724282+z-8-1663590900',
        },
        {
          image_url:
            'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-navy-new-england-patriots-mainsail-sweater-knit-fleece-full-zip-vest_pi3705000_ff_3705392-e4b2858dada222862d57_full.jpg?_hv=2&w=180',
          item_price: 9099,
          line_total: 9099,
          name: "Men's New England Patriots Cutter & Buck Navy Mainsail Sweater Knit Fleece Full-Zip Vest",
          quantity: 1,
          url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-navy-mainsail-sweater-knit-fleece-full-zip-vest/t-25045874+p-704177835812+z-8-1307168178',
        },
        {
          image_url:
            'https://fanatics.frgimages.com/new-england-patriots/mens-cutter-and-buck-heather-royal-new-england-patriots-throwback-logo-mainsail-sweater-knit-full-zip-vest_pi5168000_ff_5168837-5ecb4769be79a6d6158c_full.jpg?_hv=2&w=180',
          item_price: 9099,
          line_total: 9099,
          name: "Men's New England Patriots Cutter & Buck Heather Royal Throwback Logo Mainsail Sweater-Knit Full-Zip Vest",
          quantity: 1,
          url: 'https://www.nflshop.com/new-england-patriots/mens-new-england-patriots-cutter-and-buck-heather-royal-throwback-logo-mainsail-sweater-knit-full-zip-vest/t-36938174+p-2789840819250+z-9-2030223376',
        },
      ],
      store_id: '9385',
      store_name: 'NFL Shop',
    },
  ],
};

export default fixture;
