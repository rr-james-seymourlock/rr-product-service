import type { Product } from 'schema-dts';

/**
 * Recursively extract all SKUs from a schema.org Product, ProductGroup, or related structure.
 * Supports: Product, ProductGroup, hasVariant, isVariantOf, offers, ProductModel, and nested structures.
 * @param schema - The schema.org product object
 * @returns string[] - Flattened array of all SKUs found
 */
export function extractSkusFromSchema(schema: Product | Record<string, unknown>): string[] {
  const skus: string[] = [];
  const seen = new Set<Record<string, unknown>>();

  function recurse(object: unknown): void {
    if (!object || typeof object !== 'object' || seen.has(object as Record<string, unknown>)) {
      return;
    }
    seen.add(object as Record<string, unknown>);

    const obj = object as Record<string, unknown>;

    // Direct SKU
    if (typeof obj['sku'] === 'string') {
      skus.push(obj['sku']);
    } else if (Array.isArray(obj['sku'])) {
      skus.push(...obj['sku'].filter((s: unknown) => typeof s === 'string'));
    }

    // Offers (can be Offer or array of Offers)
    if (obj['offers']) {
      if (Array.isArray(obj['offers'])) {
        for (const offer of obj['offers']) {
          recurse(offer);
        }
      } else {
        recurse(obj['offers']);
      }
    }

    // hasVariant (ProductGroup)
    if (obj['hasVariant']) {
      if (Array.isArray(obj['hasVariant'])) {
        for (const variant of obj['hasVariant']) {
          recurse(variant);
        }
      } else {
        recurse(obj['hasVariant']);
      }
    }

    // isVariantOf (ProductModel/Product)
    if (obj['isVariantOf']) {
      if (Array.isArray(obj['isVariantOf'])) {
        for (const variantOf of obj['isVariantOf']) {
          recurse(variantOf);
        }
      } else {
        recurse(obj['isVariantOf']);
      }
    }

    // model (ProductModel)
    if (obj['model']) {
      if (Array.isArray(obj['model'])) {
        for (const model of obj['model']) {
          recurse(model);
        }
      } else {
        recurse(obj['model']);
      }
    }
  }

  recurse(schema);
  return [...new Set(skus)]; // deduplicate
}
