/**
 * Custom error classes for url-parser package
 */

/**
 * Thrown when a URL cannot be parsed or is in an invalid format
 */
export class InvalidUrlError extends Error {
  constructor(
    public readonly url: string,
    message?: string,
  ) {
    super(message || `Invalid URL format: ${url}`);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Thrown when a domain cannot be extracted from a hostname
 */
export class DomainParseError extends Error {
  constructor(
    public readonly hostname: string,
    message?: string,
  ) {
    super(message || `Failed to parse domain from hostname: ${hostname}`);
    this.name = 'DomainParseError';
  }
}

/**
 * Thrown when URL key generation fails
 */
export class UrlKeyGenerationError extends Error {
  constructor(
    public readonly baseKey: string,
    message?: string,
  ) {
    super(message || `Failed to generate URL key for: ${baseKey}`);
    this.name = 'UrlKeyGenerationError';
  }
}

/**
 * Thrown when URL normalization fails
 */
export class UrlNormalizationError extends Error {
  constructor(
    public readonly url: string,
    message?: string,
  ) {
    super(message || `Failed to normalize URL: ${url}`);
    this.name = 'UrlNormalizationError';
  }
}
