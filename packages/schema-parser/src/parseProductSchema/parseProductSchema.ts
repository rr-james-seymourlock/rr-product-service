import type { Product, WithContext } from 'schema-dts';

import { extractSkusFromSchema } from './extractSkusFromSchema';
import { isValidProductSchema } from './isValidProductSchema';

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
  console.log(product);
  return productSchema;
}
