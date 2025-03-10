import { z } from 'zod';

export const postProductSchema = z.object({
  store: z.object({
    id: z.string().min(1, "Store ID is required"),
    name: z.string().optional()
  }),
  product: z.object({
    name: z.string().min(1, "Title is required"),
    url: z.string().min(1, "URL is required"),
    canonicalUrl: z.string().optional(),
    description: z.string().optional(),
    image: z.string().min(1, "Image is required"),
    images: z.array(z.string()).optional(),
    price: z.string().optional(),
    priceCurrency: z.string().optional(),
    salePrice: z.string().optional(),
    originalPrice: z.string().optional(),
    sku: z.string().optional(),
    mpn: z.string().optional(),
    gtin: z.string().optional(),
    upc: z.string().optional(),
    productId: z.string().optional(),
    model: z.string().optional(),
    nsn: z.string().optional(),
    brand: z.string().optional(),
    color: z.string().optional(),
    size: z.string().optional(),
    category: z.string().optional(),
    currency: z.string().optional(),
    availability: z.string().optional(),
    ratingValue: z.string().optional(),
    ratingCount: z.string().optional(),
  })
});