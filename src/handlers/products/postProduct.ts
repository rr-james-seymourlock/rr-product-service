import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';
import { postProductSchema } from './postProduct.schema';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
import { extractIdsFromUrlComponents } from '@/lib/extractIdsFromUrlComponents';
import { createZodValidator } from '@/middleware/zodValidator';
import { parseUrlComponents } from '@/parseUrlComponents';

export type PostProductRequest = z.infer<typeof postProductSchema>;

const createProductHandler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  // After validation middleware, body is PostProductRequest
  const { store, product } = event.body as unknown as PostProductRequest;
  const urlComponents = parseUrlComponents(product.url);
  const ids = extractIdsFromUrlComponents({ urlComponents, storeId: store.id });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Product created successfully',
      store,
      product,
      urlComponents,
      ids: [...ids],
    }),
  };
};

// Wrap with middy, using the imported validator
export const handler = middy(createProductHandler)
  .use(jsonBodyParser())
  .use(createZodValidator(postProductSchema))
  .use(httpErrorHandler());
