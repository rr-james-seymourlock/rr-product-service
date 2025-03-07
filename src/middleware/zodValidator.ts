import middy from '@middy/core';
import { z } from 'zod';

export const createZodValidator = (schema: z.ZodType) => {
  const before = async (request: middy.Request) => {
    try {
      request.event.body = schema.parse(request.event.body);
    } catch (error: unknown) {
      const zodError = error as z.ZodError;
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Validation error',
          errors: zodError.format()
        })
      };
    }
  };

  return {
    before
  };
};