import { z } from 'zod';

import { InvalidInputStructureError, SchemaValidationError } from './errors';
import { logger } from './logger';

const SchemaOrgBase = z.looseObject({
  '@context': z.string().optional(),
  '@type': z.union([z.string(), z.array(z.string())]).optional(),
  name: z.string().optional(),
});

export type MinimalSchemaOrg = z.infer<typeof SchemaOrgBase>;

export function isValidProductSchema(schema: unknown) {
  const parsed = SchemaOrgBase.safeParse(schema);
  if (!parsed.success) {
    logger.error(
      { details: parsed.error.issues },
      'Invalid input structure for product schema',
    );
    throw new InvalidInputStructureError(parsed.error.issues);
  }
  const object = parsed.data;

  // Check for @context
  const hasContext =
    typeof object === 'object' &&
    (object['@context'] === 'https://schema.org' || object['@context'] === 'http://schema.org');

  // Check for @type
  const type = object['@type'];
  const isProductType = Array.isArray(type) ? type.includes('Product') : type === 'Product';

  // Optionally, check for required Product fields (e.g., name)
  const hasName = typeof object.name === 'string' && object.name.length > 0;

  // Validate as Product
  const isValidProduct = hasContext && isProductType && hasName;

  if (!isValidProduct) {
    const errors = [
      !hasContext && 'Missing or invalid @context',
      !isProductType && 'Missing or invalid @type (Product)',
      !hasName && 'Missing or invalid name',
    ].filter(Boolean) as string[];

    logger.error({ errors }, 'Product schema validation failed');
    throw new SchemaValidationError(errors);
  }

  logger.debug({ schemaType: type }, 'Product schema validation successful');
  return true;
}
