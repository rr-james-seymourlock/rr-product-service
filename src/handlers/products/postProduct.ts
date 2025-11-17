import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { createZodValidator } from '@/middleware/zodValidator';
import { parseUrlComponents } from '@/parseUrlComponents';
import { extractIdsFromUrlComponents } from '@/extractIdsFromUrlComponents';
import { postProductSchema } from './postProduct.schema';

export type PostProductRequest = z.infer<typeof postProductSchema>;

const createProductHandler = async (
  event: APIGatewayProxyEvent & { body: PostProductRequest },
): Promise<APIGatewayProxyResult> => {
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
    }),
  };
};

// Wrap with middy, using the imported validator
export const handler = middy()
  .use(jsonBodyParser())
  .use(createZodValidator(postProductSchema))
  .use(httpErrorHandler())
  .handler(createProductHandler);
