import type { Product, WithContext } from 'schema-dts';
import { isValidProductSchema } from './isValidProductSchema';
import { extractSkusFromSchema } from './extractSkusFromSchema';

export function parseProductSchema(schema: unknown) {
  const isValid = isValidProductSchema(schema);
  if (!isValid) {
    return;
  }

  const obj = schema as Product;
  const productSchema = obj as WithContext<Product>;

  const product = {
    name: productSchema.name,
    brand:
      typeof productSchema.brand === 'object' && productSchema.brand !== null
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
