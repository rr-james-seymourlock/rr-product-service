import { logger } from './logger';
import { parseProductSchema } from './parser';

// Example 1: Simple Product
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

parseProductSchema(simpleProduct);

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
    // Add more variants as needed
  ],
};

// Not yet supported - ProductGroup validation not implemented
// parseProductSchema(productGroup);
logger.info({ variantCount: productGroup.hasVariant.length }, 'Product group example');
