/**
 * Store ID coercion utility
 *
 * Store IDs should always be output as strings, as they may not always be numeric
 * (e.g., "uk-87262"). Input data may provide them as numbers, so this utility
 * handles the conversion consistently.
 */

/**
 * Coerce store ID to string format
 *
 * @param storeId - Store ID in various formats (string, number, undefined, null)
 * @returns Store ID as string, or undefined for invalid values
 *
 * @example
 * coerceStoreId(8333)        // "8333"
 * coerceStoreId("8333")      // "8333"
 * coerceStoreId("uk-87262")  // "uk-87262"
 * coerceStoreId(undefined)   // undefined
 * coerceStoreId(null)        // undefined
 * coerceStoreId("")          // undefined
 * coerceStoreId("   ")       // undefined
 */
export function coerceStoreId(storeId: string | number | undefined | null): string | undefined {
  if (storeId === undefined || storeId === null) {
    return undefined;
  }

  if (typeof storeId === 'number') {
    return String(storeId);
  }

  const trimmed = storeId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
