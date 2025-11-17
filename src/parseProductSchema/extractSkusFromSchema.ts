import type { Product } from 'schema-dts';

/**
 * Recursively extract all SKUs from a schema.org Product, ProductGroup, or related structure.
 * Supports: Product, ProductGroup, hasVariant, isVariantOf, offers, ProductModel, and nested structures.
 * @param schema - The schema.org product object
 * @returns string[] - Flattened array of all SKUs found
 */
export function extractSkusFromSchema(schema: Product | Record<string, unknown>): string[] {
  const skus: string[] = [];
  const seen = new Set<any>();

  function recurse(obj: any) {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) {
      return;
    }
    seen.add(obj);

    // Direct SKU
    if (typeof obj.sku === 'string') {
      skus.push(obj.sku);
    } else if (Array.isArray(obj.sku)) {
      skus.push(...obj.sku.filter((s: string) => typeof s === 'string'));
    }

    // Offers (can be Offer or array of Offers)
    if (obj.offers) {
      if (Array.isArray(obj.offers)) {
        obj.offers.forEach(recurse);
      } else {
        recurse(obj.offers);
      }
    }

    // hasVariant (ProductGroup)
    if (obj.hasVariant) {
      if (Array.isArray(obj.hasVariant)) {
        obj.hasVariant.forEach(recurse);
      } else {
        recurse(obj.hasVariant);
      }
    }

    // isVariantOf (ProductModel/Product)
    if (obj.isVariantOf) {
      if (Array.isArray(obj.isVariantOf)) {
        obj.isVariantOf.forEach(recurse);
      } else {
        recurse(obj.isVariantOf);
      }
    }

    // model (ProductModel)
    if (obj.model) {
      if (Array.isArray(obj.model)) {
        obj.model.forEach(recurse);
      } else {
        recurse(obj.model);
      }
    }
  }

  recurse(schema);
  return Array.from(new Set(skus)); // deduplicate
}
