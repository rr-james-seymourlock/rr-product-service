import type middy from '@middy/core';
import type { z } from 'zod';

export const createZodValidator = (schema: z.ZodType): middy.MiddlewareObj => {
  const before = (request: middy.Request): { statusCode: number; body: string } | undefined => {
    try {
      request.event.body = schema.parse(request.event.body);
      return undefined;
    } catch (error: unknown) {
      const zodError = error as z.ZodError;
      console.log(zodError);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Validation error',
          errors: zodError.issues,
        }),
      };
    }
  };

  return {
    before,
  };
};
