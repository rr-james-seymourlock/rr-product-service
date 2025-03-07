import { getStoreConfig } from "../storeConfigs/storeConfigManager.js";
import type { URLComponents } from "../parseUrlComponents/parseUrlComponents.js";
import { config } from "./config.js";

interface PatternExtractorInput {
  source: string;
  pattern: RegExp;
}

export const patternExtractor = ({ source, pattern }: PatternExtractorInput): Set<string> => {
  if (process.env.NODE_ENV === 'development') {
    if (!(pattern instanceof RegExp)) {
      console.warn('Invalid input: pattern must be a RegExp object. Returning empty set.');
      return new Set();
    }
    if (!pattern.global) {
      console.warn(`RegExp pattern '${pattern}' must have global flag (/g). Returning empty set.`);
      return new Set();
    }
  }

  const matches = new Set<string>();
  let match;
  const startTime = Date.now();

  try {
    while ((match = pattern.exec(source)) !== null) {
      if (Date.now() - startTime >= config.TIMEOUT_MS) {
        console.warn(`Pattern extraction timed out after ${Date.now() - startTime}ms for source: ${source}`);
        break;
      }

      if (match[1]) {matches.add(match[1]);}
      if (match[2]) {matches.add(match[2]);}

      if (matches.size >= config.MAX_RESULTS) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Reached maximum results limit of ${config.MAX_RESULTS}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Error extracting patterns from source "${source}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return matches;
}

 
export const extractIdsFromUrlComponents = ({ urlComponents, storeId }: { urlComponents: URLComponents, storeId?: string }): ReadonlyArray<string> => {
  const { domain, pathname, search, href } = urlComponents;
  const results = new Set<string>();

  try {

    const domainConfig = getStoreConfig({ domain: domain, id: storeId });

    // Check domain-specific path patterns first
    if (domainConfig?.pathnamePatterns && pathname) {
      for (const pattern of domainConfig.pathnamePatterns) {
        for (const id of patternExtractor({ source: pathname, pattern: pattern })) {
          // Apply transform function if it exists, otherwise use the original ID
          const transformedId = domainConfig.transformId ? domainConfig.transformId(id) : id;
          results.add(transformedId);
        }
      }
    }

    // Only run pathname patterns if no domain-specific pathname id's were found
    if (results.size === 0 && pathname) {
      // Iterate through all pathname patterns
      for (const pattern of config.PATTERNS.pathnamePatterns) {
        for (const id of patternExtractor({ source: pathname, pattern: pattern })) {
          results.add(id);
        }
      }
    }

    // Check domain-specific search patterns first
    if (domainConfig?.searchPatterns && search) {
      for (const pattern of domainConfig.searchPatterns) {
        for (const id of patternExtractor({ source: search, pattern: pattern })) {
          results.add(id);
        }
      }
    }

    // Only run query patterns if URL contains query parameters
    if (search) {
      for (const id of patternExtractor({ source: search, pattern: config.PATTERNS.searchPattern })) {
        results.add(id);
      }
    }
  } catch (error) {
    console.error(`Error processing URL ${href}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return Object.freeze([...results].sort());
}