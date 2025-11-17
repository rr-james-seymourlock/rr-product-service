import { z } from 'zod';

const SchemaOrgBase = z
  .object({
    '@context': z.string().optional(),
    '@type': z.union([z.string(), z.array(z.string())]).optional(),
    name: z.string().optional(),
  })
  .passthrough();

export type MinimalSchemaOrg = z.infer<typeof SchemaOrgBase>;

export function isValidProductSchema(schema: unknown): boolean {
  const parsed = SchemaOrgBase.safeParse(schema);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({ errors: ['Invalid input structure'], details: parsed.error.errors }),
    );
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
    ].filter(Boolean);
    throw new Error(JSON.stringify({ errors }));
  }

  return true;
}
