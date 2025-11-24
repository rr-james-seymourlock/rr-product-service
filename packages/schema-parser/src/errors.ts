/**
 * Custom error classes for schema-parser package
 */

/**
 * Thrown when schema validation fails
 */
export class SchemaValidationError extends Error {
  constructor(
    public readonly errors: string[],
    message?: string,
  ) {
    super(message || `Schema validation failed: ${errors.join(', ')}`);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Thrown when input structure is invalid
 */
export class InvalidInputStructureError extends Error {
  constructor(
    public readonly details: unknown,
    message?: string,
  ) {
    super(message || 'Invalid input structure');
    this.name = 'InvalidInputStructureError';
  }
}
