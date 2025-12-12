/**
 * Carter's Session Fixture - User browsing children's clothing
 *
 * User viewed 7 products but only added 4 to cart.
 * 2 of the cart items were viewed (Safari Bodysuits, Christmas Pajamas),
 * 2 were NOT viewed (Bear Print Bodysuit Set, Striped Sweater).
 *
 * Key characteristics:
 * - Product IDs use V_{code} format (e.g., V_1T773410)
 * - URLs contain the product ID in the last path segment
 * - Image URLs are from Demandware CDN with product codes
 * - Prices are in cents
 * - Tests partial matching scenario (not all cart items were viewed)
 *
 * Expected match rate: 50% (2/4 items)
 * Match methods: url, extracted_id
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'carters-session-001',
  description: "Carter's session with 4 cart items, 7 product views, 50% match rate",
  storeId: '10752',
  storeName: "Carter's",

  /**
   * Expected matches based on manual analysis:
   * - Safari Bodysuits: Cart extractedId V_1T773410 matches product extractedId and SKU
   * - Christmas Pajamas: Cart extractedId V_3T264710 matches product extractedId and SKU
   * - Bear Print Set: NOT viewed - user added without viewing product page
   * - Striped Sweater: NOT viewed - user added without viewing product page
   */
  expectedMatches: [
    {
      cartItemName:
        "Carter's Baby 4-Pack Safari Print Cotton Long-Sleeve Multipack Bodysuits - Ivory/Yellow",
      productSku: 'V_1T773410',
      confidence: 'high' as const,
      reason: 'URL match and extracted_id match on V_1T773410',
    },
    {
      cartItemName:
        "Carter's Kid Christmas Cars DreamPlush Long-Sleeve Snug Fit 2-Piece Pajamas - Navy Navy",
      productSku: 'V_3T264710',
      confidence: 'high' as const,
      reason: 'URL match and extracted_id match on V_3T264710',
    },
  ],

  /**
   * Raw product view events from the session
   * 7 products viewed, only 2 are in the cart
   */
  productViews: [
    {
      amount: '16.00',
      currency: 'USD',
      description: "For the baby who's already a little wild at heart...",
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw74fa9b6f/productimages/1T773410.jpg?sw=1200',
      ],
      name: 'Baby 4-Pack Safari Print Cotton Long-Sleeve Multipack Bodysuits - Ivory/Yellow',
      productid_list: [],
      rating: ['4.9'],
      sku_list: ['V_1T773410'],
      mpn_list: ['V_1T773410'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/baby-4-pack-safari-print-cotton-long-sleeve-multipack-bodysuits-ivory-yellow/V_1T773410',
    },
    {
      amount: '16.00',
      currency: 'USD',
      description: "Whether it's snack time or nap time...",
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw458a21aa/productimages/1U024710.jpg?sw=1200',
      ],
      name: 'Baby 4-Pack Snack Time Long-Sleeve Multipack Bodysuits - Blue/White/Brown',
      productid_list: [],
      rating: ['4.9'],
      sku_list: ['V_1U024710'],
      mpn_list: ['V_1U024710'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/baby-4-pack-snack-time-long-sleeve-multipack-bodysuits-blue-white-brown/V_1U024710',
    },
    {
      amount: '11.99',
      currency: 'USD',
      description: 'The softest beginnings...',
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw813567f0/productimages/1T353910.jpg?sw=1200',
      ],
      name: 'Baby 2-Pack Organic Cotton Bodysuits',
      productid_list: [],
      rating: ['5.0'],
      sku_list: ['V_1T353910'],
      mpn_list: ['V_1T353910'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/baby-2-pack-organic-cotton-bodysuits/V_1T353910',
    },
    {
      amount: '14.00',
      currency: 'USD',
      description: 'Signature wash jeans...',
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw440d9f8e/productimages/3N376010.jpg?sw=1200',
      ],
      name: 'Kid Dark Wash Straight-Leg Jeans',
      productid_list: [],
      rating: ['4.9'],
      sku_list: ['V_3N376010'],
      mpn_list: ['V_3N376010'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/kid-dark-wash-straight-leg-jeans/V_3N376010',
    },
    {
      amount: '14.00',
      currency: 'USD',
      description: 'Signature wash jeans...',
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dwc9b3249e/productimages/3N376012.png?sw=1200',
      ],
      name: 'Kid Medium Wash Straight-Leg Jeans',
      productid_list: [],
      rating: ['4.9'],
      sku_list: ['V_3N376012'],
      mpn_list: ['V_3N376012'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/kid-medium-wash-straight-leg-jeans/V_3N376012',
    },
    {
      amount: '13.99',
      currency: 'USD',
      description: 'Throw on and go...',
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dwe51a18d2/productimages/6T817710_FIG1.jpg?sw=1200',
      ],
      name: 'Toddler Boy Colorblock Pullover Sweater - Navy/Cinnamon',
      productid_list: [],
      sku_list: ['V_6T817710'],
      mpn_list: ['V_6T817710'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/toddler-boy-colorblock-pullover-sweater-navy-cinnamon/V_6T817710',
    },
    {
      amount: '8.99',
      currency: 'USD',
      description: 'Get ready for cozy nights...',
      image_url_list: [
        'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw622d3170/productimages/3T264710.jpg?sw=1200',
      ],
      name: 'Kid Christmas Cars DreamPlush Long-Sleeve Snug Fit 2-Piece Pajamas - Navy',
      productid_list: [],
      rating: ['3.8'],
      sku_list: ['V_3T264710'],
      mpn_list: ['V_3T264710'],
      gtin_list: [],
      store_id: '10752',
      store_name: "Carter's",
      url: 'https://www.carters.com/p/kid-christmas-cars-dreamplush-long-sleeve-snug-fit-2-piece-pajamas-navy/V_3T264710',
    },
  ],

  /**
   * Raw cart events from the session
   * 4 items in cart - 2 viewed, 2 not viewed
   */
  cartEvents: [
    {
      cart_total: 4998,
      cart_total_qty: 16,
      currency: 'USD',
      product_list: [
        {
          image_url:
            'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dwbf30f05d/productimages/1U024210.jpg?sw=130',
          item_price: 1300,
          line_total: 1300,
          name: "Carter's Baby Boy 3-Piece Bear Print Long-Sleeve Bodysuit & Pant Set - Brown/White",
          quantity: 1,
          url: 'https://www.carters.com/p/baby-boy-3-piece-bear-print-long-sleeve-bodysuit-and-pant-set-brown-white/V_1U024210',
        },
        {
          image_url:
            'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw666f71d8/productimages/3T510810.jpg?sw=130',
          item_price: 171,
          line_total: 1199,
          name: "Carter's Boys Striped Cotton Long-Sleeve Sweater - Blue Blue",
          quantity: 7,
          url: 'https://www.carters.com/p/boys-striped-cotton-long-sleeve-sweater-blue/V_3T510810',
        },
        {
          image_url:
            'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw74fa9b6f/productimages/1T773410.jpg?sw=130',
          item_price: 1600,
          line_total: 1600,
          name: "Carter's Baby 4-Pack Safari Print Cotton Long-Sleeve Multipack Bodysuits - Ivory/Yellow",
          quantity: 1,
          url: 'https://www.carters.com/p/baby-4-pack-safari-print-cotton-long-sleeve-multipack-bodysuits-ivory-yellow/V_1T773410',
        },
        {
          image_url:
            'https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw622d3170/productimages/3T264710.jpg?sw=130',
          item_price: 128,
          line_total: 899,
          name: "Carter's Kid Christmas Cars DreamPlush Long-Sleeve Snug Fit 2-Piece Pajamas - Navy Navy",
          quantity: 7,
          url: 'https://www.carters.com/p/kid-christmas-cars-dreamplush-long-sleeve-snug-fit-2-piece-pajamas-navy/V_3T264710',
        },
      ],
      store_id: '10752',
      store_name: "Carter's",
    },
  ],
};

export default fixture;
