/**
 * Custom error classes for product-id-extractor package
 */

/**
 * Thrown when pattern extraction times out
 */
export class PatternExtractionTimeoutError extends Error {
  constructor(
    public readonly duration: number,
    public readonly sourceLength: number,
    message?: string,
  ) {
    super(
      message ||
        `Pattern extraction timed out after ${duration}ms (source length: ${sourceLength})`,
    );
    this.name = 'PatternExtractionTimeoutError';
  }
}

/**
 * Thrown when pattern extraction fails
 */
export class PatternExtractionError extends Error {
  constructor(
    public readonly sourceLength: number,
    message?: string,
  ) {
    super(message || `Error extracting patterns (source length: ${sourceLength})`);
    this.name = 'PatternExtractionError';
  }
}

/**
 * Thrown when URL processing fails
 */
export class UrlProcessingError extends Error {
  constructor(
    public readonly hrefLength: number,
    message?: string,
  ) {
    super(message || `Error processing URL (length: ${hrefLength})`);
    this.name = 'UrlProcessingError';
  }
}
