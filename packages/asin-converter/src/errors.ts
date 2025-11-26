/**
 * Custom error classes for the ASIN converter package
 */

/**
 * Base error class for all ASIN converter errors
 */
export class AsinConverterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AsinConverterError';
    Object.setPrototypeOf(this, AsinConverterError.prototype);
  }
}

/**
 * Thrown when input validation fails
 */
export class InvalidInputError extends AsinConverterError {
  constructor(message: string = 'Invalid input provided') {
    super(message);
    this.name = 'InvalidInputError';
    Object.setPrototypeOf(this, InvalidInputError.prototype);
  }
}

/**
 * Thrown when the Synccentric API request fails
 */
export class ApiRequestError extends AsinConverterError {
  public readonly statusCode?: number | undefined;
  public readonly cause?: Error | undefined;

  constructor(message: string, statusCode?: number, cause?: Error) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

/**
 * Thrown when the API response cannot be parsed or is invalid
 */
export class ApiResponseError extends AsinConverterError {
  constructor(message: string = 'Invalid API response') {
    super(message);
    this.name = 'ApiResponseError';
    Object.setPrototypeOf(this, ApiResponseError.prototype);
  }
}

/**
 * Thrown when a product is not found in the Synccentric database
 */
export class ProductNotFoundError extends AsinConverterError {
  public readonly asins: string[];

  constructor(asins: string[]) {
    super(`Product not found for ASINs: ${asins.join(', ')}`);
    this.name = 'ProductNotFoundError';
    this.asins = asins;
    Object.setPrototypeOf(this, ProductNotFoundError.prototype);
  }
}

/**
 * Thrown when required configuration is missing
 */
export class ConfigurationError extends AsinConverterError {
  constructor(message: string = 'Missing required configuration') {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
