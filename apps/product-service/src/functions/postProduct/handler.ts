import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';

import { extractIdsFromUrlComponents } from '@rr/product-id-extractor';
import { parseUrlComponents } from '@rr/url-parser';

import { createZodValidator } from '../../middleware/zodValidator';
import { postProductSchema } from './schema';

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
