import type { Product, WithContext } from 'schema-dts';

import { extractSkusFromSchema } from './extract-skus';
import { isValidProductSchema } from './is-valid-schema';
import { logger } from './logger';

export function parseProductSchema(schema: unknown): WithContext<Product> | undefined {
  const isValid = isValidProductSchema(schema);
  if (!isValid) {
    return undefined;
  }

  const object = schema as Product;
  const productSchema = object as WithContext<Product>;

  const product = {
    name: productSchema.name,
    brand:
      typeof productSchema.brand === 'object'
        ? (productSchema.brand as { name?: string }).name
        : productSchema.brand,
    model: productSchema.model,
    sku: productSchema.sku,
    description: productSchema.description,
    skus: extractSkusFromSchema(productSchema),
  };

  logger.debug(
    {
      name: product.name,
      brand: product.brand,
      skuCount: product.skus.length,
    },
    'Parsed product schema',
  );

  return productSchema;
}
