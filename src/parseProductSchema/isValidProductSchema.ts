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
  const obj = parsed.data;

  // Check for @context
  const hasContext =
    typeof obj === 'object' &&
    (obj['@context'] === 'https://schema.org' || obj['@context'] === 'http://schema.org');

  // Check for @type
  const type = obj && obj['@type'];
  const isProductType =
    typeof type === 'string'
      ? type === 'Product'
      : Array.isArray(type)
        ? type.includes('Product')
        : false;

  // Optionally, check for required Product fields (e.g., name)
  const hasName = typeof obj?.name === 'string' && obj.name.length > 0;

  // Validate as Product
  const isValidProduct = hasContext && isProductType && hasName;

  if (!isValidProduct) {
    const errors = [
      !hasContext ? 'Missing or invalid @context' : null,
      !isProductType ? 'Missing or invalid @type (Product)' : null,
      !hasName ? 'Missing or invalid name' : null,
    ].filter(Boolean);
    throw new Error(JSON.stringify({ errors }));
  }

  return true;
}
