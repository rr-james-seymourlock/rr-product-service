import {
  ApiRequestError,
  ApiResponseError,
  ConfigurationError,
  InvalidInputError,
  ProductNotFoundError,
} from './errors.js';
import { logger } from './logger.js';
import type {
  AsinConverterConfig,
  ConvertAsinsInput,
  ConvertAsinsOutput,
  SynccentricResponse,
} from './types.js';
import { ConvertAsinsInputSchema, SynccentricResponseSchema } from './types.js';

/**
 * Default configuration
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_LOCALE = 'US';

/**
 * Converts ASIN identifiers to product IDs (UPC, SKU, MPN) using the Synccentric API
 *
 * @param asins - Array of ASIN identifiers to convert
 * @param config - Configuration for the Synccentric API
 * @returns Array of product identifiers (UPC, SKU, MPN) filtered for non-empty values
 * @throws {InvalidInputError} If input validation fails
 * @throws {ConfigurationError} If required configuration is missing
 * @throws {ApiRequestError} If the API request fails
 * @throws {ApiResponseError} If the API response is invalid
 * @throws {ProductNotFoundError} If the product is not found in Synccentric database
 *
 * @example
 * ```typescript
 * const config = {
 *   host: 'https://api.synccentric.com',
 *   authKey: process.env.SYNCCENTRIC_AUTH_KEY,
 *   timeout: 10000,
 * };
 *
 * const productIds = await convertAsins(['B0FQFB8FMG'], config);
 * // Returns: ['195950543698', 'MFHP4LL/A']
 * ```
 */
export async function convertAsins(
  asins: ConvertAsinsInput,
  config: AsinConverterConfig,
): Promise<ConvertAsinsOutput> {
  // Validate input
  const validationResult = ConvertAsinsInputSchema.safeParse(asins);
  if (!validationResult.success) {
    logger.warn(
      { asins, errors: validationResult.error.issues },
      'Invalid input for ASIN conversion',
    );
    throw new InvalidInputError(`Invalid ASINs provided: ${validationResult.error.message}`);
  }

  // Validate configuration
  if (!config.host) {
    throw new ConfigurationError('Synccentric host is required');
  }
  if (!config.authKey) {
    throw new ConfigurationError('Synccentric auth key is required');
  }

  const timeout = config.timeout ?? DEFAULT_TIMEOUT;
  const asinsAsParams = asins.join(',');

  // Ensure base URL ends with / for proper path appending
  const baseUrl = config.host.endsWith('/') ? config.host : `${config.host}/`;

  // Build API URL
  const url = new URL('search', baseUrl);
  url.searchParams.set('identifier', asinsAsParams);
  url.searchParams.set('type', 'asin');
  url.searchParams.set('locale', DEFAULT_LOCALE);

  logger.debug({ asins, url: url.toString() }, 'Converting ASINs to product IDs');

  try {
    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    // Make API request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.authKey}`,
        'Content-Type': 'application/json',
      },
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    // Check response status
    if (!response.ok) {
      logger.error(
        {
          asins,
          statusCode: response.status,
          statusText: response.statusText,
        },
        'Synccentric API request failed',
      );
      throw new ApiRequestError(
        `Synccentric API request failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    // Parse response body
    const responseData = (await response.json()) as unknown;

    // Validate response structure
    const parsedResponse = SynccentricResponseSchema.safeParse(responseData);
    if (!parsedResponse.success) {
      logger.error(
        {
          asins,
          responseData,
          errors: parsedResponse.error.issues,
        },
        'Invalid response from Synccentric API',
      );
      throw new ApiResponseError(`Invalid API response: ${parsedResponse.error.message}`);
    }

    const synccentricResponse: SynccentricResponse = parsedResponse.data;

    // Check for API errors
    if (synccentricResponse.errors && synccentricResponse.errors.length > 0) {
      const firstError = synccentricResponse.errors[0];

      if (!firstError) {
        throw new ApiResponseError('API returned empty errors array');
      }

      // Handle product not found specifically
      if (firstError.id === 'product_not_found') {
        logger.info({ asins }, 'Product not found in Synccentric database');
        throw new ProductNotFoundError(asins);
      }

      // Handle other API errors
      logger.error(
        {
          asins,
          errors: synccentricResponse.errors,
        },
        'Synccentric API returned errors',
      );
      throw new ApiResponseError(`API error: ${firstError.title || firstError.id}`);
    }

    // Extract product IDs from response
    if (!synccentricResponse.data || synccentricResponse.data.length === 0) {
      logger.info({ asins }, 'No product data in Synccentric response');
      return {};
    }

    const firstProduct = synccentricResponse.data[0];
    if (!firstProduct) {
      logger.info({ asins }, 'No product in data array');
      return {};
    }

    const { upc, sku, mpn } = firstProduct.attributes;

    // Return structured identifiers
    const identifiers = {
      ...(upc && { upc }),
      ...(sku && { sku }),
      ...(mpn && { mpn }),
    };

    logger.info(
      {
        asins,
        identifiers,
        count: Object.keys(identifiers).length,
      },
      'Successfully converted ASINs to product IDs',
    );

    return identifiers;
  } catch (error) {
    // Re-throw known errors
    if (
      error instanceof InvalidInputError ||
      error instanceof ConfigurationError ||
      error instanceof ApiRequestError ||
      error instanceof ApiResponseError ||
      error instanceof ProductNotFoundError
    ) {
      throw error;
    }

    // Handle fetch abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({ asins, timeout }, 'Synccentric API request timed out');
      throw new ApiRequestError(`Request timed out after ${timeout}ms`);
    }

    // Handle unexpected errors
    logger.error({ asins, error }, 'Unexpected error during ASIN conversion');
    throw new ApiRequestError(
      `Unexpected error during ASIN conversion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
}
