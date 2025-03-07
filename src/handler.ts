import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { z } from 'zod';
import { createZodValidator } from './middleware/zodValidator.js';
import { parseUrlComponents } from './parseUrlComponents/parseUrlComponents.js';
import { extractIdsFromUrlComponents } from './extractIdsFromUrlComponents/extractIdsFromUrlComponents.js';

const productSchema = z.object({
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

type ProductRequest = z.infer<typeof productSchema>;

const postProductHandler = async (event: APIGatewayProxyEvent & { body: ProductRequest }): Promise<APIGatewayProxyResult> => {
  const { store, product } = event.body;
  const urlComponents = parseUrlComponents(product.url);
  const ids = extractIdsFromUrlComponents({ urlComponents, storeId: store.id });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Product created successfully',
      store: store,
      product: product,
      urlComponents: urlComponents,
      ids: ids,
    })
  };
};

// Wrap with middy, using the imported validator
export const postProduct = middy()
  .use(jsonBodyParser())
  .use(createZodValidator(productSchema))
  .use(httpErrorHandler())
  .handler(postProductHandler);