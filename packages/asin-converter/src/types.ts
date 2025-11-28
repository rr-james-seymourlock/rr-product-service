import { z } from 'zod';

/**
 * Synccentric API response structure
 */

// Product attributes from Synccentric API
export const SynccentricProductAttributesSchema = z.object({
  upc: z.string().optional(),
  sku: z.string().optional(),
  mpn: z.string().optional(),
});

export type SynccentricProductAttributes = z.infer<typeof SynccentricProductAttributesSchema>;

// Single product data item
export const SynccentricProductDataSchema = z.object({
  attributes: SynccentricProductAttributesSchema,
});

export type SynccentricProductData = z.infer<typeof SynccentricProductDataSchema>;

// Error structure from Synccentric API
export const SynccentricErrorSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  detail: z.string().optional(),
});

export type SynccentricError = z.infer<typeof SynccentricErrorSchema>;

// Complete API response
export const SynccentricResponseSchema = z.object({
  data: z.array(SynccentricProductDataSchema).optional(),
  errors: z.array(SynccentricErrorSchema).optional(),
});

export type SynccentricResponse = z.infer<typeof SynccentricResponseSchema>;

/**
 * Converter input/output types
 */

// Input: Array of ASIN identifiers
export const ConvertAsinsInputSchema = z.array(z.string().min(1)).min(1);

export type ConvertAsinsInput = z.infer<typeof ConvertAsinsInputSchema>;

// Output: Structured product identifiers (UPC, SKU, MPN)
export const ProductIdentifiersSchema = z.object({
  upc: z.string().optional(),
  sku: z.string().optional(),
  mpn: z.string().optional(),
});

export type ProductIdentifiers = z.infer<typeof ProductIdentifiersSchema>;

export const ConvertAsinsOutputSchema = ProductIdentifiersSchema;

export type ConvertAsinsOutput = z.infer<typeof ConvertAsinsOutputSchema>;

/**
 * Configuration types
 */

export interface AsinConverterConfig {
  host: string;
  authKey: string;
  timeout?: number; // Request timeout in milliseconds
}
