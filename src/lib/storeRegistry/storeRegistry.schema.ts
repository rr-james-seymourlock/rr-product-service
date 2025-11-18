import { z } from 'zod';

/**
 * Schema for store alias configuration.
 * Validates alternative domain and ID mappings for stores.
 */
export const storeAliasSchema = z.object({
  id: z.string().min(1, 'Alias ID cannot be empty'),
  domain: z.string().min(1, 'Alias domain cannot be empty'),
});

export type StoreAlias = z.infer<typeof storeAliasSchema>;

/**
 * Schema for store configuration validation.
 * Validates complete store configuration including patterns and transformations.
 *
 * @example
 * ```typescript
 * const config: StoreConfig = {
 *   id: '5246',
 *   domain: 'target.com',
 *   pathnamePatterns: [/\ba-(\d{6,24})\b/gi],
 *   aliases: [{ id: '5246-alias', domain: 'target.co.uk' }],
 * };
 * storeConfigSchema.parse(config); // ✓ Valid
 * ```
 */
export const storeConfigSchema = z.object({
  id: z.string().min(1, 'Store ID cannot be empty'),
  domain: z.string().min(1, 'Store domain cannot be empty'),
  aliases: z.array(storeAliasSchema).optional(),
  patternFormats: z.array(z.string()).optional(),
  pathnamePatterns: z.array(z.instanceof(RegExp)).optional(),
  searchPatterns: z.array(z.instanceof(RegExp)).optional(),
  transformId: z.function().optional(),
});

export type StoreConfig = z.infer<typeof storeConfigSchema>;

/**
 * Schema for store identifier input validation.
 * Used by getStoreConfig to validate lookup parameters.
 *
 * At least one of domain or id must be provided.
 *
 * @example
 * ```typescript
 * // Lookup by ID
 * storeIdentifierSchema.parse({ id: '5246' }); // ✓ Valid
 *
 * // Lookup by domain
 * storeIdentifierSchema.parse({ domain: 'target.com' }); // ✓ Valid
 *
 * // Both provided (id takes precedence)
 * storeIdentifierSchema.parse({ id: '5246', domain: 'target.com' }); // ✓ Valid
 * ```
 */
export const storeIdentifierSchema = z
  .object({
    domain: z.string().min(1, 'Domain cannot be empty').optional(),
    id: z.string().min(1, 'ID cannot be empty').optional(),
  })
  .refine((data) => data.domain !== undefined || data.id !== undefined, {
    message: 'Either domain or id must be provided',
  });

export type StoreIdentifier = z.infer<typeof storeIdentifierSchema>;

/**
 * Schema for array of store configurations.
 * Validates the complete store registry configuration.
 */
export const storeConfigsSchema = z.array(storeConfigSchema);

export type StoreConfigs = z.infer<typeof storeConfigsSchema>;
