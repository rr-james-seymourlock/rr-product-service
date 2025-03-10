import { z } from 'zod';

export const postProductSchema = z.object({
  store: z.object({
    id: z.string().min(1, "Store ID is required"),
    name: z.string().optional()
  }),
  product: z.object({
    url: z.string().min(1, "URL is required"),
    title: z.string().min(1, "Title is required"),
    image: z.string().min(1, "Image is required"),
    description: z.string().optional(),
    price: z.string().optional(),
  })
});