/**
 * Kohl's Session Fixture - 100% match rate with multiple signals
 *
 * User browsed 3 products on the Kohl's iOS app and added all 3 to cart.
 * All cart items were viewed, demonstrating multiple matching signals.
 *
 * Key characteristics:
 * - Product URLs: /product/prd-{productId}/{slug}.jsp (no SKU)
 * - Cart URLs: /product/prd-{productId}/{slug}.jsp?skuId={sku} (SKU in query param)
 * - Product views have SKU in sku_list array
 * - Matches via extracted_id_sku (cart skuId matches product sku_list)
 * - Also matches via extracted_id (cart prd-ID matches product prd-ID)
 * - Multiple signals provide high confidence matching
 *
 * Expected match rate: 100% (3/3 items)
 * Match methods: extracted_id_sku (high confidence) + extracted_id (medium) + title (low)
 */
import type { CartEnricherFixture } from './types.js';

export const fixture: CartEnricherFixture = {
  name: 'kohls-session-001',
  description: "Kohl's iOS app session with 3 cart items, all viewed, 100% match rate",
  storeId: '7206',
  storeName: "Kohl's",

  /**
   * Expected matches based on manual analysis:
   * - All 3 cart items should match via extracted_id_sku (skuId in URL matches product SKU)
   * - Also match via extracted_id (prd-ID matches)
   * - Title fuzzy matching provides additional low-confidence signal
   */
  expectedMatches: [
    {
      cartItemName: 'Kenwood Checkered Pillow Bed with Paw Print Pet Bed',
      productSku: '76565656',
      confidence: 'high' as const,
      reason: 'Cart skuId=76565656 matches product sku_list, plus prd-7692699 extracted_id match',
    },
    {
      cartItemName: 'Mattel Minecraft Plush Zombie Chicken Jockey Toy, 8-inch Soft Doll',
      productSku: '76294583',
      confidence: 'high' as const,
      reason: 'Cart skuId=76294583 matches product sku_list, plus prd-7751254 extracted_id match',
    },
    {
      cartItemName: 'The Big One® Cheetah Plush Pillow',
      productSku: '71648961',
      confidence: 'high' as const,
      reason: 'Cart skuId=71648961 matches product sku_list, plus prd-6808395 extracted_id match',
    },
  ],

  /**
   * Raw product view events from the session (deduplicated)
   * User viewed each product multiple times but we only need unique products
   */
  productViews: [
    {
      amount: '22.39',
      currency: 'USD',
      description:
        'Give your furry friend the ultimate comfort with the Kenwood checkered pillow bed, designed to provide a cozy retreat for relaxation and play. Featuring a charming paw print detail and an inviting plaid pattern, this bed makes for a delightful gift that both pets and their owners will adore.',
      image_url_list: [
        'https://media.kohlsimg.com/is/image/kohls/7692699?wid=600&hei=600&op_sharpen=1',
      ],
      name: 'Kenwood Checkered Pillow Bed with Paw Print Pet Bed',
      productid_list: [],
      rating: ['3.5'],
      sku_list: ['76565656'],
      mpn_list: [],
      gtin_list: [],
      store_id: '7206',
      store_name: "Kohl's",
      url: 'https://www.kohls.com/product/prd-7692699/kenwood-checkered-pillow-bed-with-paw-print-pet-bed.jsp',
    },
    {
      amount: '14.99',
      currency: 'USD',
      description:
        'Bring the world of Minecraft to life with this cuddly plush character that features an adorable chicken jockey! Perfect for playtime, this delightful 8-inch soft doll invites kids to embrace their imagination and collect all their favorite Minecraft friends, making it a fantastic gift for little gamers and collectors alike.',
      image_url_list: [
        'https://media.kohlsimg.com/is/image/kohls/7751254?wid=600&hei=600&op_sharpen=1',
      ],
      name: 'Mattel Minecraft Plush Zombie Chicken Jockey Toy, 8-inch Soft Doll',
      productid_list: [],
      rating: ['5.0'],
      sku_list: ['76294583'],
      mpn_list: [],
      gtin_list: [],
      store_id: '7206',
      store_name: "Kohl's",
      url: 'https://www.kohls.com/product/prd-7751254/mattel-minecraft-plush-zombie-chicken-jockey-toy-8inch-soft-doll.jsp',
    },
    {
      amount: '15.99',
      currency: 'USD',
      description:
        'Your little one is sure to love this adorable cheetah plush pillow from The Big One!',
      image_url_list: [
        'https://media.kohlsimg.com/is/image/kohls/6808395?wid=600&hei=600&op_sharpen=1',
      ],
      name: 'The Big One® Cheetah Plush Pillow',
      productid_list: [],
      rating: ['4.8'],
      sku_list: ['71648961'],
      mpn_list: [],
      gtin_list: [],
      store_id: '7206',
      store_name: "Kohl's",
      url: 'https://www.kohls.com/product/prd-6808395/the-big-one-cheetah-plush-pillow.jsp',
    },
  ],

  /**
   * Raw cart events from the session
   * Multiple cart snapshots but same 3 items throughout
   */
  cartEvents: [
    {
      cart_total: 6297,
      cart_total_qty: 3,
      currency: 'USD',
      product_list: [
        {
          image_url:
            'https://media.kohlsimg.com/is/image/kohls/7692699?wid=350&hei=350&op_sharpen=1',
          item_price: 2799,
          line_total: 2799,
          name: 'Kenwood Checkered Pillow Bed with Paw Print Pet Bed',
          quantity: 1,
          url: 'https://www.kohls.com/product/prd-7692699/kenwood-checkered-pillow-bed-with-paw-print-pet-bed.jsp?skuId=76565656',
        },
        {
          image_url:
            'https://media.kohlsimg.com/is/image/kohls/7751254?wid=350&hei=350&op_sharpen=1',
          item_price: 1499,
          line_total: 1499,
          name: 'Mattel Minecraft Plush Zombie Chicken Jockey Toy, 8-inch Soft Doll',
          quantity: 1,
          url: 'https://www.kohls.com/product/prd-7751254/mattel-minecraft-plush-zombie-chicken-jockey-toy-8-inch-soft-doll.jsp?skuId=76294583',
        },
        {
          image_url:
            'https://media.kohlsimg.com/is/image/kohls/6808395?wid=350&hei=350&op_sharpen=1',
          item_price: 1999,
          line_total: 1999,
          name: 'The Big One® Cheetah Plush Pillow',
          quantity: 1,
          url: 'https://www.kohls.com/product/prd-6808395/the-big-one-cheetah-plush-pillow.jsp?skuId=71648961',
        },
      ],
      store_id: '7206',
      store_name: "Kohl's",
    },
  ],
};

export default fixture;
