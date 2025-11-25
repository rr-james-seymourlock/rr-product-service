import { describe, expect, it } from 'vitest';

import { extractSkusFromSchema } from '../extract-skus';

// Simple Product
const simpleProduct = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'iPhone 15 Pro',
  brand: {
    '@type': 'Brand',
    name: 'Apple',
  },
  model: 'A3108',
  sku: 'IPHONE15PRO-256GB-BLUE',
  description: 'Latest iPhone with advanced camera system',
};

// Product with sku as array
const productWithSkuArray = {
  ...simpleProduct,
  sku: ['IPHONE15PRO-256GB-BLUE', 'IPHONE15PRO-512GB-BLACK'],
};

// ProductGroup with hasVariant as array
const productGroup = {
  '@context': 'https://schema.org',
  '@type': 'ProductGroup',
  name: 'iPhone 15 Pro',
  brand: {
    '@type': 'Brand',
    name: 'Apple',
  },
  description: 'Latest iPhone with advanced camera system, available in multiple variants',
  hasVariant: [
    {
      '@type': 'Product',
      model: 'A3108',
      sku: 'IPHONE15PRO-256GB-BLUE',
      color: 'Blue',
      storage: '256GB',
    },
    {
      '@type': 'Product',
      model: 'A3108',
      sku: 'IPHONE15PRO-512GB-BLACK',
      color: 'Black',
      storage: '512GB',
    },
  ],
};

// ProductGroup with hasVariant as single object
const productGroupSingleVariant = {
  ...productGroup,
  hasVariant: {
    '@type': 'Product',
    sku: 'IPHONE15PRO-128GB-GREEN',
  },
};

// Product with offers as array
const productWithOffers = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Clarks Falalala Shoes for Men',
  sku: 'SHOE-GROUP',
  offers: [
    {
      '@type': 'Offer',
      sku: 'QWERTYSHOE-9',
      price: 45.99,
    },
    {
      '@type': 'Offer',
      sku: 'QWERTYSHOE-10',
      price: 45.99,
    },
  ],
};

// Product with offers as single object
const productWithSingleOffer = {
  ...simpleProduct,
  offers: {
    '@type': 'Offer',
    sku: 'IPHONE15PRO-OFFER-SKU',
  },
};

// ProductModel with nested offers
const productModelWithOffers = {
  '@type': 'ProductModel',
  sku: 'MODEL-SKU',
  offers: [
    { '@type': 'Offer', sku: 'MODEL-OFFER-1' },
    { '@type': 'Offer', sku: 'MODEL-OFFER-2' },
  ],
};

// Product with isVariantOf
const productWithIsVariantOf = {
  ...simpleProduct,
  isVariantOf: {
    '@type': 'ProductGroup',
    sku: 'GROUP-SKU',
    hasVariant: [
      { '@type': 'Product', sku: 'VARIANT-1' },
      { '@type': 'Product', sku: 'VARIANT-2' },
    ],
  },
};

// Product with model as array
const productWithModelArray = {
  ...simpleProduct,
  model: [
    { '@type': 'ProductModel', sku: 'MODEL-1' },
    { '@type': 'ProductModel', sku: 'MODEL-2' },
  ],
};

// Deeply nested structure
const deeplyNested = {
  '@type': 'ProductGroup',
  hasVariant: [
    {
      '@type': 'ProductModel',
      sku: 'NESTED-MODEL',
      offers: {
        '@type': 'Offer',
        sku: 'NESTED-OFFER',
      },
      model: {
        '@type': 'ProductModel',
        sku: 'NESTED-MODEL-2',
        offers: [{ '@type': 'Offer', sku: 'NESTED-OFFER-2' }],
      },
    },
  ],
};

// Edge case: no SKUs
const noSkus = {
  '@type': 'Product',
  name: 'No SKU Product',
};

// Edge case: duplicate SKUs in different places
const duplicateSkus = {
  '@type': 'Product',
  sku: 'DUPLICATE-SKU',
  offers: [
    { '@type': 'Offer', sku: 'DUPLICATE-SKU' },
    { '@type': 'Offer', sku: 'UNIQUE-SKU' },
  ],
  hasVariant: {
    '@type': 'Product',
    sku: 'DUPLICATE-SKU',
  },
};

describe('extractSkusFromSchema', () => {
  it('should extract SKU from a simple Product', () => {
    const skus = extractSkusFromSchema(simpleProduct);
    expect(skus).toEqual(['IPHONE15PRO-256GB-BLUE']);
  });

  it('should extract all SKUs from a Product with sku as array', () => {
    const skus = extractSkusFromSchema(productWithSkuArray);
    expect(skus.sort()).toEqual(['IPHONE15PRO-256GB-BLUE', 'IPHONE15PRO-512GB-BLACK'].sort());
  });

  it('should extract all SKUs from a ProductGroup with hasVariant (array)', () => {
    const skus = extractSkusFromSchema(productGroup);
    expect(skus.sort()).toEqual(['IPHONE15PRO-256GB-BLUE', 'IPHONE15PRO-512GB-BLACK'].sort());
  });

  it('should extract SKU from a ProductGroup with hasVariant (single object)', () => {
    const skus = extractSkusFromSchema(productGroupSingleVariant);
    expect(skus).toEqual(['IPHONE15PRO-128GB-GREEN']);
  });

  it('should extract all SKUs from a Product with offers (array)', () => {
    const skus = extractSkusFromSchema(productWithOffers);
    expect(skus.sort()).toEqual(['SHOE-GROUP', 'QWERTYSHOE-9', 'QWERTYSHOE-10'].sort());
  });

  it('should extract SKU from a Product with offers (single object)', () => {
    const skus = extractSkusFromSchema(productWithSingleOffer);
    expect(skus.sort()).toEqual(['IPHONE15PRO-256GB-BLUE', 'IPHONE15PRO-OFFER-SKU'].sort());
  });

  it('should extract all SKUs from a ProductModel with nested offers', () => {
    const skus = extractSkusFromSchema(productModelWithOffers);
    expect(skus.sort()).toEqual(['MODEL-SKU', 'MODEL-OFFER-1', 'MODEL-OFFER-2'].sort());
  });

  it('should extract all SKUs from a Product with isVariantOf', () => {
    const skus = extractSkusFromSchema(productWithIsVariantOf);
    expect(skus.sort()).toEqual(
      ['IPHONE15PRO-256GB-BLUE', 'GROUP-SKU', 'VARIANT-1', 'VARIANT-2'].sort(),
    );
  });

  it('should extract all SKUs from a Product with model as array', () => {
    const skus = extractSkusFromSchema(productWithModelArray);
    expect(skus.sort()).toEqual(['IPHONE15PRO-256GB-BLUE', 'MODEL-1', 'MODEL-2'].sort());
  });

  it('should extract all SKUs from a deeply nested structure', () => {
    const skus = extractSkusFromSchema(deeplyNested);
    expect(skus.sort()).toEqual(
      ['NESTED-MODEL', 'NESTED-OFFER', 'NESTED-MODEL-2', 'NESTED-OFFER-2'].sort(),
    );
  });

  it('should return an empty array if no SKUs are present', () => {
    const skus = extractSkusFromSchema(noSkus);
    expect(skus).toEqual([]);
  });

  it('should deduplicate SKUs found in multiple places', () => {
    const skus = extractSkusFromSchema(duplicateSkus);
    expect(skus.sort()).toEqual(['DUPLICATE-SKU', 'UNIQUE-SKU'].sort());
  });
});
