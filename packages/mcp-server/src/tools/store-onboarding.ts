/**
 * Store Onboarding MCP Tools
 *
 * Guides developers through configuring product ID extraction from URLs for new stores.
 * The tools help:
 * 1. Validate store metadata (ID, name, domain)
 * 2. Analyze product URLs to identify ID patterns
 * 3. Generate store-registry config code
 * 4. Create product-id-extractor test fixtures
 * 5. Validate extraction patterns
 * 6. Automate git workflow (branch, commit, PR)
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { exec } from 'node:child_process';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

// ============================================================================
// Constants
// ============================================================================

/** Test execution timeout (2 minutes) */
const TEST_TIMEOUT_MS = 120000;

/** Minimum recommended product URLs for pattern confidence */
const MIN_RECOMMENDED_URLS = 5;

/** Maximum URLs allowed per request */
const MAX_URLS_PER_REQUEST = 50;

/** Maximum output length for test results display */
const MAX_OUTPUT_LENGTH = 2000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape special regex characters in a string for safe use in RegExp constructor
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape shell argument for safe use in exec commands
 * Wraps in single quotes and escapes any existing single quotes
 */
function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// ============================================================================
// Types
// ============================================================================

/** Confidence level for pattern analysis */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Location where product ID was found in URL */
export type IdLocation = 'pathname' | 'search_param';

/** Format of the product ID */
export type IdFormat = 'numeric' | 'alphanumeric' | 'prefixed' | 'uuid' | 'unknown';

/** URL filtering reason */
export type FilterReason =
  | 'cart'
  | 'checkout'
  | 'account'
  | 'homepage'
  | 'search'
  | 'login'
  | 'other';

/** Result of analyzing a single URL */
export interface UrlAnalysisResult {
  /** Original URL as provided by user - preserved for fixtures */
  originalUrl: string;
  /** Normalized URL used internally for pattern analysis (lowercased, trimmed) */
  normalizedUrl: string;
  extractedIds: string[];
  idLocation: IdLocation | null;
  idFormat: IdFormat;
  confidence: ConfidenceLevel;
  patternDescription: string;
  pathSegmentIndex?: number;
  searchParamName?: string;
}

/** URL that was filtered out as non-product */
export interface FilteredUrl {
  url: string;
  reason: FilterReason;
  explanation: string;
}

/** Pattern identified from URL analysis */
export interface IdentifiedPattern {
  type: IdLocation;
  description: string;
  confidence: ConfidenceLevel;
  format: IdFormat;
  /** For pathname patterns, which segment contains the ID (0-indexed from end) */
  pathSegmentFromEnd?: number;
  /** For search patterns, which parameter name */
  searchParamName?: string;
  /** Optional prefix to strip (e.g., 'prd-') */
  prefix?: string;
  /** Example URLs matching this pattern */
  exampleUrls: string[];
  /** Example IDs extracted */
  exampleIds: string[];
}

/** Generated regex pattern for store config */
export interface GeneratedPattern {
  type: 'pathname' | 'search';
  tsRegexBuilderCode: string;
  comment: string;
  rawRegex: string;
}

/** Test case for fixture generation */
export interface FixtureTestCase {
  url: string;
  expectedSkus: string[];
}

// ============================================================================
// StoreOnboardingManager
// ============================================================================

export class StoreOnboardingManager {
  private static ROOT_PATH = process.cwd();

  private static get PACKAGES_DIR() {
    return join(this.ROOT_PATH, 'packages');
  }

  private static get STORE_REGISTRY_DIR() {
    return join(this.PACKAGES_DIR, 'store-registry');
  }

  private static get PRODUCT_ID_EXTRACTOR_DIR() {
    return join(this.PACKAGES_DIR, 'product-id-extractor');
  }

  private static get FIXTURES_DIR() {
    return join(this.PRODUCT_ID_EXTRACTOR_DIR, 'src', '__fixtures__');
  }

  static setRootPath(path: string) {
    this.ROOT_PATH = path;
  }

  // --------------------------------------------------------------------------
  // Store Validation
  // --------------------------------------------------------------------------

  /**
   * Check if a store already exists in the registry
   */
  static async checkStoreExists(
    storeId?: string,
    domain?: string,
  ): Promise<{
    exists: boolean;
    existingById: boolean;
    existingByDomain: boolean;
    existingStoreId?: string;
    existingDomain?: string;
  }> {
    try {
      const configPath = join(this.STORE_REGISTRY_DIR, 'src', 'config.ts');
      const configContent = await readFile(configPath, 'utf8');

      let existingById = false;
      let existingByDomain = false;
      let foundStoreId: string | undefined;
      let foundDomain: string | undefined;

      // Check by store ID (escape to prevent regex injection)
      if (storeId) {
        const idPattern = new RegExp(`id:\\s*['"]${escapeRegex(storeId)}['"]`, 'i');
        existingById = idPattern.test(configContent);
        if (existingById) {
          foundStoreId = storeId;
        }
      }

      // Check by domain (escape to prevent regex injection)
      if (domain) {
        const domainPattern = new RegExp(`domain:\\s*['"]${escapeRegex(domain)}['"]`, 'i');
        existingByDomain = domainPattern.test(configContent);
        if (existingByDomain) {
          foundDomain = domain;
        }
      }

      const result: {
        exists: boolean;
        existingById: boolean;
        existingByDomain: boolean;
        existingStoreId?: string;
        existingDomain?: string;
      } = {
        exists: existingById || existingByDomain,
        existingById,
        existingByDomain,
      };
      if (foundStoreId) result.existingStoreId = foundStoreId;
      if (foundDomain) result.existingDomain = foundDomain;
      return result;
    } catch {
      return {
        exists: false,
        existingById: false,
        existingByDomain: false,
      };
    }
  }

  /**
   * Validate store ID format (should be numeric string)
   */
  static validateStoreId(storeId: string): { valid: boolean; error?: string } {
    if (!storeId || storeId.trim() === '') {
      return { valid: false, error: 'Store ID cannot be empty' };
    }

    if (!/^\d+$/.test(storeId)) {
      return { valid: false, error: 'Store ID must be numeric (e.g., "5246")' };
    }

    return { valid: true };
  }

  /**
   * Validate domain format
   */
  static validateDomain(domain: string): { valid: boolean; error?: string } {
    if (!domain || domain.trim() === '') {
      return { valid: false, error: 'Domain cannot be empty' };
    }

    // Remove protocol if present
    let cleanDomain = domain.replace(/^https?:\/\//, '');
    // Remove www. prefix
    cleanDomain = cleanDomain.replace(/^www\./, '');
    // Remove trailing slash
    cleanDomain = cleanDomain.replace(/\/$/, '');

    // Basic domain validation
    const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
    if (!domainPattern.test(cleanDomain)) {
      return {
        valid: false,
        error: `Invalid domain format: "${domain}". Expected format: example.com`,
      };
    }

    return { valid: true };
  }

  // --------------------------------------------------------------------------
  // URL Processing
  // --------------------------------------------------------------------------

  /**
   * Non-product URL patterns to filter out
   * Note: Category patterns removed as they often match product URLs
   * (e.g., /departments/.../7011953 is a product on Ace Hardware)
   */
  private static NON_PRODUCT_PATTERNS: Array<{
    pattern: RegExp;
    reason: FilterReason;
    explanation: string;
  }> = [
    // Cart/Checkout
    { pattern: /\/cart\b/i, reason: 'cart', explanation: 'Shopping cart URL' },
    { pattern: /\/basket\b/i, reason: 'cart', explanation: 'Shopping basket URL' },
    { pattern: /\/checkout\b/i, reason: 'checkout', explanation: 'Checkout URL' },
    { pattern: /\/payment\b/i, reason: 'checkout', explanation: 'Payment page URL' },
    { pattern: /\/order\b/i, reason: 'checkout', explanation: 'Order page URL' },

    // Account
    { pattern: /\/account\b/i, reason: 'account', explanation: 'Account page URL' },
    { pattern: /\/login\b/i, reason: 'login', explanation: 'Login page URL' },
    { pattern: /\/signin\b/i, reason: 'login', explanation: 'Sign in page URL' },
    { pattern: /\/register\b/i, reason: 'account', explanation: 'Registration page URL' },
    { pattern: /\/signup\b/i, reason: 'account', explanation: 'Sign up page URL' },
    { pattern: /\/my-account\b/i, reason: 'account', explanation: 'My account page URL' },
    { pattern: /\/profile\b/i, reason: 'account', explanation: 'Profile page URL' },

    // Homepage/Landing
    { pattern: /^https?:\/\/[^/]+\/?$/i, reason: 'homepage', explanation: 'Homepage URL' },
    { pattern: /\/home\/?$/i, reason: 'homepage', explanation: 'Homepage URL' },
    { pattern: /\/landing\b/i, reason: 'homepage', explanation: 'Landing page URL' },

    // Search
    { pattern: /\/search\b/i, reason: 'search', explanation: 'Search results URL' },
    { pattern: /[?&]q=/i, reason: 'search', explanation: 'Search query URL' },
    { pattern: /[?&]query=/i, reason: 'search', explanation: 'Search query URL' },
    { pattern: /[?&]search=/i, reason: 'search', explanation: 'Search query URL' },

    // Other non-product
    { pattern: /\/help\b/i, reason: 'other', explanation: 'Help page URL' },
    { pattern: /\/faq\b/i, reason: 'other', explanation: 'FAQ page URL' },
    { pattern: /\/contact\b/i, reason: 'other', explanation: 'Contact page URL' },
    { pattern: /\/about\b/i, reason: 'other', explanation: 'About page URL' },
    { pattern: /\/privacy\b/i, reason: 'other', explanation: 'Privacy page URL' },
    { pattern: /\/terms\b/i, reason: 'other', explanation: 'Terms page URL' },
    { pattern: /\/store-locator\b/i, reason: 'other', explanation: 'Store locator URL' },
    { pattern: /\/stores?\/?$/i, reason: 'other', explanation: 'Stores page URL' },
    { pattern: /\/customer-service\b/i, reason: 'other', explanation: 'Customer service page URL' },
    { pattern: /\/support\b/i, reason: 'other', explanation: 'Support page URL' },
    { pattern: /\/shipping\b/i, reason: 'other', explanation: 'Shipping info page URL' },
    { pattern: /\/returns\b/i, reason: 'other', explanation: 'Returns page URL' },
    { pattern: /\/gift-cards?\b/i, reason: 'other', explanation: 'Gift card page URL' },
    { pattern: /\/rewards\b/i, reason: 'other', explanation: 'Rewards page URL' },
    { pattern: /\/sitemap\b/i, reason: 'other', explanation: 'Sitemap URL' },
  ];

  /**
   * Normalize a URL to consistent format
   */
  static normalizeUrl(url: string): string {
    try {
      // Add protocol if missing
      let normalizedUrl = url.trim();
      if (!normalizedUrl.match(/^https?:\/\//i)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const parsed = new URL(normalizedUrl);

      // Lowercase the URL
      parsed.hostname = parsed.hostname.toLowerCase();
      parsed.pathname = parsed.pathname.toLowerCase();

      // Remove trailing slash from pathname (unless it's just "/")
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      return parsed.toString();
    } catch {
      return url.toLowerCase().trim();
    }
  }

  /**
   * Filter URLs to remove non-product pages
   */
  static filterUrls(
    urls: string[],
    expectedDomain?: string,
  ): {
    productUrls: string[];
    filteredUrls: FilteredUrl[];
    warnings: string[];
  } {
    const productUrls: string[] = [];
    const filteredUrls: FilteredUrl[] = [];
    const warnings: string[] = [];

    for (const url of urls) {
      const normalizedUrl = this.normalizeUrl(url);

      // Check domain match if expected domain provided
      if (expectedDomain) {
        try {
          const parsed = new URL(normalizedUrl);
          const urlDomain = parsed.hostname.replace(/^www\./, '');
          const cleanExpectedDomain = expectedDomain.replace(/^www\./, '');

          if (
            !urlDomain.includes(cleanExpectedDomain) &&
            !cleanExpectedDomain.includes(urlDomain)
          ) {
            filteredUrls.push({
              url: normalizedUrl,
              reason: 'other',
              explanation: `Domain mismatch: expected ${cleanExpectedDomain}, got ${urlDomain}`,
            });
            continue;
          }
        } catch {
          // Invalid URL, skip
          filteredUrls.push({
            url,
            reason: 'other',
            explanation: 'Invalid URL format',
          });
          continue;
        }
      }

      // Check against non-product patterns
      let isFiltered = false;
      for (const { pattern, reason, explanation } of this.NON_PRODUCT_PATTERNS) {
        if (pattern.test(normalizedUrl)) {
          filteredUrls.push({ url: normalizedUrl, reason, explanation });
          isFiltered = true;
          break;
        }
      }

      if (!isFiltered) {
        productUrls.push(normalizedUrl);
      }
    }

    // Check if we have enough URLs
    if (productUrls.length < MIN_RECOMMENDED_URLS) {
      warnings.push(
        `Only ${productUrls.length} product URLs remaining after filtering. ` +
          `Minimum ${MIN_RECOMMENDED_URLS} recommended for pattern confidence.`,
      );
    }

    return { productUrls, filteredUrls, warnings };
  }

  /**
   * Deduplicate URLs
   */
  static deduplicateUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const url of urls) {
      const normalized = this.normalizeUrl(url);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(normalized);
      }
    }

    return unique;
  }

  // --------------------------------------------------------------------------
  // Pattern Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze a single URL to identify potential product ID patterns
   */
  static analyzeUrl(url: string): UrlAnalysisResult {
    const normalizedUrl = this.normalizeUrl(url);
    const extractedIds: string[] = [];
    let idLocation: IdLocation | null = null;
    let idFormat: IdFormat = 'unknown';
    let confidence: ConfidenceLevel = 'low';
    let patternDescription = 'No pattern identified';
    let pathSegmentIndex: number | undefined;
    let searchParamName: string | undefined;

    try {
      const parsed = new URL(normalizedUrl);
      const pathname = parsed.pathname;
      const searchParams = parsed.searchParams;

      // Common ID patterns
      const patterns = {
        numeric: /^\d{4,}$/,
        alphanumeric: /^[a-z0-9]{6,}$/i,
        prefixed: /^([a-z]{1,4}[-_])?[a-z0-9]{4,}$/i,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      };

      // Analyze pathname segments
      const segments = pathname.split('/').filter(Boolean);

      // Check last few segments for ID-like values
      for (let i = segments.length - 1; i >= Math.max(0, segments.length - 3); i--) {
        const segment = segments[i];
        if (!segment) continue;

        // Check for common product path indicators
        const isAfterProductIndicator =
          i > 0 &&
          segments[i - 1] &&
          /^(p|product|item|dp|pd|sku|prod|products?|items?)$/i.test(segments[i - 1] ?? '');

        // Check for ID patterns
        if (patterns.numeric.test(segment)) {
          extractedIds.push(segment);
          idLocation = 'pathname';
          idFormat = 'numeric';
          pathSegmentIndex = segments.length - 1 - i;
          confidence = isAfterProductIndicator ? 'high' : 'medium';
          patternDescription = `Numeric ID in pathname segment ${i + 1} (${segment})`;
          break;
        }

        // Check for prefixed IDs (e.g., A-12345678)
        const prefixMatch = segment.match(/^([a-z]{1,4})[-_](\d{4,}|[a-z0-9]{6,})$/i);
        if (prefixMatch) {
          extractedIds.push(prefixMatch[2]!.toLowerCase());
          idLocation = 'pathname';
          idFormat = 'prefixed';
          pathSegmentIndex = segments.length - 1 - i;
          confidence = 'high';
          patternDescription = `Prefixed ID "${prefixMatch[1]}-" in pathname (${segment})`;
          break;
        }

        // Check for UUID
        if (patterns.uuid.test(segment)) {
          extractedIds.push(segment.toLowerCase());
          idLocation = 'pathname';
          idFormat = 'uuid';
          pathSegmentIndex = segments.length - 1 - i;
          confidence = 'medium';
          patternDescription = `UUID in pathname segment ${i + 1}`;
          break;
        }

        // Check for alphanumeric IDs after product indicators
        if (isAfterProductIndicator && patterns.alphanumeric.test(segment)) {
          extractedIds.push(segment.toLowerCase());
          idLocation = 'pathname';
          idFormat = 'alphanumeric';
          pathSegmentIndex = segments.length - 1 - i;
          confidence = 'high';
          patternDescription = `Alphanumeric ID after product indicator (${segment})`;
          break;
        }
      }

      // If no pathname ID found, check search params for primary ID
      if (extractedIds.length === 0) {
        const idParamNames = [
          'skuid',
          'sku',
          'id',
          'productid',
          'product_id',
          'item_id',
          'itemid',
          'pid',
        ];

        for (const paramName of idParamNames) {
          const value = searchParams.get(paramName);
          if (value && (patterns.numeric.test(value) || patterns.alphanumeric.test(value))) {
            extractedIds.push(value.toLowerCase());
            idLocation = 'search_param';
            searchParamName = paramName;
            idFormat = patterns.numeric.test(value) ? 'numeric' : 'alphanumeric';
            confidence = 'high';
            patternDescription = `ID in search param "${paramName}" (${value})`;
            break;
          }
        }
      }

      // Also check for secondary IDs in query params (variant codes, color IDs, etc.)
      // These are extracted IN ADDITION to pathname IDs
      const secondaryParamNames = [
        'variationproductcode',
        'variantid',
        'variant_id',
        'colorid',
        'color_id',
        'sizeid',
        'size_id',
        'skuid',
        'sku',
      ];

      // Build a map of lowercase param names to values for case-insensitive lookup
      const paramsLower = new Map<string, string>();
      for (const [key, value] of searchParams.entries()) {
        paramsLower.set(key.toLowerCase(), value);
      }

      for (const paramName of secondaryParamNames) {
        const value = paramsLower.get(paramName);
        if (value && patterns.numeric.test(value) && !extractedIds.includes(value.toLowerCase())) {
          extractedIds.push(value.toLowerCase());
          // Update description if we found additional IDs
          if (patternDescription !== 'No pattern identified') {
            patternDescription += ` + ${paramName} param`;
          }
        }
      }
    } catch {
      patternDescription = 'Failed to parse URL';
    }

    const result: UrlAnalysisResult = {
      originalUrl: url,
      normalizedUrl,
      extractedIds,
      idLocation,
      idFormat,
      confidence,
      patternDescription,
    };
    if (pathSegmentIndex !== undefined) result.pathSegmentIndex = pathSegmentIndex;
    if (searchParamName !== undefined) result.searchParamName = searchParamName;
    return result;
  }

  /**
   * Analyze multiple URLs and identify common patterns
   */
  static analyzeUrls(urls: string[]): {
    results: UrlAnalysisResult[];
    patterns: IdentifiedPattern[];
    warnings: string[];
  } {
    const results = urls.map((url) => this.analyzeUrl(url));
    const warnings: string[] = [];

    // Group by pattern type
    const patternGroups = new Map<
      string,
      {
        results: UrlAnalysisResult[];
        type: IdLocation;
        format: IdFormat;
        pathSegmentFromEnd?: number;
        searchParamName?: string;
      }
    >();

    for (const result of results) {
      if (!result.idLocation || result.extractedIds.length === 0) {
        continue;
      }

      const key =
        result.idLocation === 'pathname'
          ? `pathname:${result.pathSegmentIndex}:${result.idFormat}`
          : `search:${result.searchParamName}:${result.idFormat}`;

      if (!patternGroups.has(key)) {
        const groupEntry: {
          results: UrlAnalysisResult[];
          type: IdLocation;
          format: IdFormat;
          pathSegmentFromEnd?: number;
          searchParamName?: string;
        } = {
          results: [],
          type: result.idLocation,
          format: result.idFormat,
        };
        if (result.pathSegmentIndex !== undefined)
          groupEntry.pathSegmentFromEnd = result.pathSegmentIndex;
        if (result.searchParamName !== undefined)
          groupEntry.searchParamName = result.searchParamName;
        patternGroups.set(key, groupEntry);
      }

      patternGroups.get(key)!.results.push(result);
    }

    // Convert to identified patterns
    const patterns: IdentifiedPattern[] = [];

    for (const [, group] of patternGroups) {
      const urlCount = group.results.length;
      const totalUrls = urls.length;
      // Protect against division by zero
      const coverage = totalUrls > 0 ? urlCount / totalUrls : 0;

      // Determine confidence based on coverage
      let confidence: ConfidenceLevel = 'low';
      if (coverage >= 0.8) {
        confidence = 'high';
      } else if (coverage >= 0.5) {
        confidence = 'medium';
      }

      let description = '';
      if (group.type === 'pathname') {
        description = `Product ID in pathname (segment ${group.pathSegmentFromEnd} from end), format: ${group.format}`;
      } else {
        description = `Product ID in search param "${group.searchParamName}", format: ${group.format}`;
      }

      const pattern: IdentifiedPattern = {
        type: group.type,
        description,
        confidence,
        format: group.format,
        exampleUrls: group.results.slice(0, 3).map((r) => r.normalizedUrl),
        exampleIds: group.results.slice(0, 3).flatMap((r) => r.extractedIds),
      };
      if (group.pathSegmentFromEnd !== undefined)
        pattern.pathSegmentFromEnd = group.pathSegmentFromEnd;
      if (group.searchParamName !== undefined) pattern.searchParamName = group.searchParamName;
      patterns.push(pattern);
    }

    // Check for URLs with no identified pattern
    const noPatternUrls = results.filter((r) => r.extractedIds.length === 0);
    if (noPatternUrls.length > 0) {
      warnings.push(
        `${noPatternUrls.length} URL(s) had no identifiable product ID pattern:\n` +
          noPatternUrls
            .slice(0, 3)
            .map((r) => `  - ${r.originalUrl}`)
            .join('\n'),
      );
    }

    return { results, patterns, warnings };
  }

  // --------------------------------------------------------------------------
  // Code Generation
  // --------------------------------------------------------------------------

  /**
   * Generate ts-regex-builder code for a pattern
   */
  static generatePatternCode(pattern: IdentifiedPattern): GeneratedPattern {
    let tsRegexBuilderCode = '';
    let comment = '';
    let rawRegex = '';

    if (pattern.type === 'pathname') {
      // Generate pathname pattern
      if (pattern.format === 'prefixed' && pattern.prefix) {
        // Pattern with prefix like "A-12345678"
        rawRegex = `/${pattern.prefix.toLowerCase()}(\\d+)/`;
        tsRegexBuilderCode = `buildRegExp([
  '${pattern.prefix.toLowerCase()}',
  capture(oneOrMore(digit)),
])`;
        comment = `// Matches ${pattern.prefix}{numeric_id} in pathname`;
      } else if (pattern.format === 'numeric') {
        // Numeric ID pattern - match numeric segment
        rawRegex = `/\\/(\\d{4,})(?:\\/|$)/`;
        tsRegexBuilderCode = `buildRegExp([
  '/',
  capture(repeat(digit, { min: 4 })),
  choiceOf('/', endOfString),
])`;
        comment = '// Matches numeric product ID (4+ digits) in pathname';
      } else if (pattern.format === 'alphanumeric') {
        // Alphanumeric ID pattern
        rawRegex = `/\\/([a-z0-9]{6,})(?:\\/|$)/i`;
        tsRegexBuilderCode = `buildRegExp([
  '/',
  capture(repeat(charClass(charRange('a', 'z'), charRange('0', '9')), { min: 6 })),
  choiceOf('/', endOfString),
], { ignoreCase: true })`;
        comment = '// Matches alphanumeric product ID (6+ chars) in pathname';
      } else {
        // Generic pathname pattern
        rawRegex = `/\\/([a-z0-9-]+)(?:\\/|$)/i`;
        tsRegexBuilderCode = `buildRegExp([
  '/',
  capture(oneOrMore(charClass(charRange('a', 'z'), charRange('0', '9'), '-'))),
  choiceOf('/', endOfString),
], { ignoreCase: true })`;
        comment = '// Matches product ID in pathname';
      }

      return {
        type: 'pathname',
        tsRegexBuilderCode,
        comment,
        rawRegex,
      };
    } else {
      // Generate search param pattern
      const paramName = pattern.searchParamName || 'id';

      if (pattern.format === 'numeric') {
        rawRegex = `/${paramName}=(\\d+)/i`;
        tsRegexBuilderCode = `buildRegExp([
  '${paramName}=',
  capture(oneOrMore(digit)),
], { ignoreCase: true })`;
        comment = `// Matches numeric ID in ${paramName} query parameter`;
      } else {
        rawRegex = `/${paramName}=([a-z0-9]+)/i`;
        tsRegexBuilderCode = `buildRegExp([
  '${paramName}=',
  capture(oneOrMore(charClass(charRange('a', 'z'), charRange('0', '9')))),
], { ignoreCase: true })`;
        comment = `// Matches alphanumeric ID in ${paramName} query parameter`;
      }

      return {
        type: 'search',
        tsRegexBuilderCode,
        comment,
        rawRegex,
      };
    }
  }

  /**
   * Generate full store config code
   */
  static generateStoreConfig(
    storeId: string,
    storeName: string,
    domain: string,
    patterns: GeneratedPattern[],
  ): string {
    const pathnamePatterns = patterns.filter((p) => p.type === 'pathname');
    const searchPatterns = patterns.filter((p) => p.type === 'search');

    let code = `  // ${storeName} (ID: ${storeId})\n`;
    code += `  {\n`;
    code += `    id: '${storeId}',\n`;
    code += `    domain: '${domain}',\n`;

    if (pathnamePatterns.length > 0) {
      code += `    pathnamePatterns: [\n`;
      for (const pattern of pathnamePatterns) {
        code += `      ${pattern.comment}\n`;
        code += `      ${pattern.tsRegexBuilderCode},\n`;
      }
      code += `    ],\n`;
    }

    if (searchPatterns.length > 0) {
      code += `    searchPatterns: [\n`;
      for (const pattern of searchPatterns) {
        code += `      ${pattern.comment}\n`;
        code += `      ${pattern.tsRegexBuilderCode},\n`;
      }
      code += `    ],\n`;
    }

    code += `  },`;

    return code;
  }

  // --------------------------------------------------------------------------
  // Fixture Generation
  // --------------------------------------------------------------------------

  /**
   * Generate fixture JSON content
   */
  static generateFixture(
    storeName: string,
    storeId: string,
    domain: string,
    testCases: FixtureTestCase[],
  ): string {
    const fixture = {
      name: storeName,
      id: parseInt(storeId, 10),
      domain,
      testCases,
    };

    return JSON.stringify(fixture, null, 2);
  }

  /**
   * Get fixture file path for a domain
   */
  static getFixturePath(domain: string): string {
    const filename = domain.replace(/^www\./, '') + '.json';
    return join(this.FIXTURES_DIR, filename);
  }

  /**
   * Check if fixture already exists
   */
  static async fixtureExists(domain: string): Promise<boolean> {
    try {
      await readFile(this.getFixturePath(domain), 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write fixture file
   */
  static async writeFixture(domain: string, content: string): Promise<string> {
    const filePath = this.getFixturePath(domain);
    await mkdir(this.FIXTURES_DIR, { recursive: true });
    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /** Zod schema for validating fixture files */
  private static readonly fixtureSchema = z.object({
    name: z.string(),
    id: z.number(),
    domain: z.string(),
    testCases: z.array(
      z.object({
        url: z.string(),
        expectedSkus: z.array(z.string()),
      }),
    ),
  });

  /**
   * Read existing fixture with validation
   */
  static async readFixture(domain: string): Promise<{
    name: string;
    id: number;
    domain: string;
    testCases: FixtureTestCase[];
  } | null> {
    try {
      const content = await readFile(this.getFixturePath(domain), 'utf8');
      const parsed: unknown = JSON.parse(content);
      // Validate fixture structure
      const result = this.fixtureSchema.safeParse(parsed);
      if (!result.success) {
        console.error(`Invalid fixture format for ${domain}:`, result.error.message);
        return null;
      }
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Append test cases to existing fixture (deduplicating by URL)
   */
  static async appendToFixture(
    domain: string,
    newTestCases: FixtureTestCase[],
  ): Promise<{
    success: boolean;
    added: number;
    duplicates: number;
    filePath: string;
    error?: string;
  }> {
    const filePath = this.getFixturePath(domain);

    try {
      const existing = await this.readFixture(domain);

      if (!existing) {
        return {
          success: false,
          added: 0,
          duplicates: 0,
          filePath,
          error: 'Fixture does not exist. Use store_generate_fixture for new stores.',
        };
      }

      // Deduplicate by URL
      const existingUrls = new Set(existing.testCases.map((tc) => tc.url.toLowerCase()));
      const uniqueNewCases = newTestCases.filter((tc) => !existingUrls.has(tc.url.toLowerCase()));
      const duplicateCount = newTestCases.length - uniqueNewCases.length;

      if (uniqueNewCases.length === 0) {
        return {
          success: true,
          added: 0,
          duplicates: duplicateCount,
          filePath,
        };
      }

      // Append new cases
      existing.testCases.push(...uniqueNewCases);

      // Write updated fixture
      await writeFile(filePath, JSON.stringify(existing, null, 2), 'utf8');

      return {
        success: true,
        added: uniqueNewCases.length,
        duplicates: duplicateCount,
        filePath,
      };
    } catch (error) {
      return {
        success: false,
        added: 0,
        duplicates: 0,
        filePath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // --------------------------------------------------------------------------
  // Test Validation
  // --------------------------------------------------------------------------

  /**
   * Filter test output to remove verbose logging and keep only summary
   */
  private static filterTestOutput(output: string): string {
    const lines = output.split('\n');
    const filteredLines = lines.filter((line) => {
      // Skip JSON log lines (they start with {"level":)
      if (line.trim().startsWith('{"level":')) return false;
      // Skip stdout pipe lines
      if (line.includes('stdout |') || line.includes('stdout[2m |')) return false;
      // Keep everything else
      return true;
    });
    return filteredLines.join('\n').trim();
  }

  /**
   * Run product-id-extractor tests for a specific fixture
   */
  static async runFixtureTests(domain: string): Promise<{
    success: boolean;
    output: string;
    passCount: number;
    failCount: number;
    timedOut?: boolean;
  }> {
    try {
      // Set LOG_LEVEL=error to suppress debug logs during tests
      const { stdout, stderr } = await execAsync(
        `LOG_LEVEL=error pnpm --filter @rr/product-id-extractor test -- --grep "${domain}"`,
        { cwd: this.ROOT_PATH, timeout: TEST_TIMEOUT_MS },
      );

      const rawOutput = stdout + stderr;
      const output = this.filterTestOutput(rawOutput);

      // Vitest format: "X passed" / "X failed"
      const passMatch = rawOutput.match(/(\d+)\s+passed/);
      const failMatch = rawOutput.match(/(\d+)\s+fail/i);

      return {
        success: !failMatch || parseInt(failMatch[1]!, 10) === 0,
        output,
        passCount: passMatch ? parseInt(passMatch[1]!, 10) : 0,
        failCount: failMatch ? parseInt(failMatch[1]!, 10) : 0,
      };
    } catch (error) {
      const rawOutput = error instanceof Error ? error.message : String(error);
      const timedOut = rawOutput.includes('ETIMEDOUT') || rawOutput.includes('killed');
      return {
        success: false,
        output: timedOut
          ? `Test execution timed out after ${TEST_TIMEOUT_MS / 1000}s. This may indicate a hanging test or slow system.`
          : this.filterTestOutput(rawOutput),
        passCount: 0,
        failCount: 1,
        timedOut,
      };
    }
  }

  /**
   * Run all product-id-extractor tests (regression check)
   */
  static async runAllTests(): Promise<{
    success: boolean;
    output: string;
    passCount: number;
    failCount: number;
    timedOut?: boolean;
  }> {
    try {
      // Set LOG_LEVEL=error to suppress debug logs during tests
      const { stdout, stderr } = await execAsync(
        `LOG_LEVEL=error pnpm --filter @rr/product-id-extractor test`,
        { cwd: this.ROOT_PATH, timeout: TEST_TIMEOUT_MS },
      );

      const rawOutput = stdout + stderr;
      const output = this.filterTestOutput(rawOutput);

      // Vitest format: "X passed" / "X failed"
      const passMatch = rawOutput.match(/(\d+)\s+passed/);
      const failMatch = rawOutput.match(/(\d+)\s+fail/i);

      return {
        success: !failMatch || parseInt(failMatch[1]!, 10) === 0,
        output,
        passCount: passMatch ? parseInt(passMatch[1]!, 10) : 0,
        failCount: failMatch ? parseInt(failMatch[1]!, 10) : 0,
      };
    } catch (error) {
      const rawOutput = error instanceof Error ? error.message : String(error);
      const timedOut = rawOutput.includes('ETIMEDOUT') || rawOutput.includes('killed');
      return {
        success: false,
        output: timedOut
          ? `Test execution timed out after ${TEST_TIMEOUT_MS / 1000}s. This may indicate a hanging test or slow system.`
          : this.filterTestOutput(rawOutput),
        passCount: 0,
        failCount: 1,
        timedOut,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Git Workflow
  // --------------------------------------------------------------------------

  /**
   * Check git working directory status
   */
  static async checkGitStatus(): Promise<{
    clean: boolean;
    hasUncommitted: boolean;
    hasConflicts: boolean;
    conflictFiles: string[];
    stagedFiles: string[];
    modifiedFiles: string[];
  }> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.ROOT_PATH });
      const lines = stdout.split('\n').filter(Boolean);

      const conflictFiles: string[] = [];
      const stagedFiles: string[] = [];
      const modifiedFiles: string[] = [];

      for (const line of lines) {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        // Check for merge conflicts (UU, AA, DD, etc.)
        if (status.includes('U') || status === 'AA' || status === 'DD') {
          conflictFiles.push(file);
        } else if (status[0] !== ' ' && status[0] !== '?') {
          stagedFiles.push(file);
        }
        if (status[1] !== ' ' && status[1] !== '?') {
          modifiedFiles.push(file);
        }
      }

      return {
        clean: lines.length === 0,
        hasUncommitted: stagedFiles.length > 0 || modifiedFiles.length > 0,
        hasConflicts: conflictFiles.length > 0,
        conflictFiles,
        stagedFiles,
        modifiedFiles,
      };
    } catch {
      return {
        clean: false,
        hasUncommitted: false,
        hasConflicts: false,
        conflictFiles: [],
        stagedFiles: [],
        modifiedFiles: [],
      };
    }
  }

  /**
   * Rollback uncommitted changes to specific files
   */
  static async rollbackFiles(files: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      for (const file of files) {
        // Use escaped shell argument to prevent command injection
        await execAsync(`git checkout -- ${escapeShellArg(file)}`, { cwd: this.ROOT_PATH });
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a file if it exists (for cleanup)
   */
  static async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await unlink(filePath);
      return { success: true };
    } catch (error) {
      // File might not exist, that's okay
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return { success: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a feature branch for the store
   */
  static async createBranch(
    storeName: string,
  ): Promise<{ success: boolean; branchName: string; error?: string }> {
    // Sanitize branch name: only allow alphanumeric, hyphens (already done by replace)
    const branchName = `feat/store-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-config`;

    try {
      // Branch name is already sanitized, but escape for safety
      await execAsync(`git checkout -b ${escapeShellArg(branchName)}`, { cwd: this.ROOT_PATH });
      return { success: true, branchName };
    } catch (error) {
      return {
        success: false,
        branchName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stage files for commit
   */
  static async stageFiles(files: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Escape each file path to prevent command injection
      const escapedFiles = files.map(escapeShellArg).join(' ');
      await execAsync(`git add ${escapedFiles}`, { cwd: this.ROOT_PATH });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a commit
   */
  static async createCommit(
    storeName: string,
    storeId: string,
    isUpdate: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    const action = isUpdate ? 'update' : 'add';
    const message = `feat(store-registry): ${action} ${storeName} (${storeId}) store configuration`;

    try {
      // Use escaped shell argument for commit message
      await execAsync(`git commit -m ${escapeShellArg(message)}`, { cwd: this.ROOT_PATH });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Push branch and create PR
   */
  static async pushAndCreatePR(
    branchName: string,
    storeName: string,
    storeId: string,
    patterns: IdentifiedPattern[],
    isUpdate: boolean,
  ): Promise<{ success: boolean; prUrl?: string; error?: string }> {
    try {
      // Push branch (branch name is sanitized in createBranch, but escape for safety)
      await execAsync(`git push -u origin ${escapeShellArg(branchName)}`, { cwd: this.ROOT_PATH });

      // Create PR
      const action = isUpdate ? 'Update' : 'Add';
      const title = `${action} ${storeName} (${storeId}) store configuration`;

      const patternsList = patterns.map((p) => `- ${p.description}`).join('\n');

      const body = `## Summary
${action} product ID extraction configuration for ${storeName}.

## Patterns Identified
${patternsList}

## Test Results
All product-id-extractor tests pass.

---
Generated by Store Onboarding MCP Tool`;

      // Use escaped shell arguments for title and body
      const { stdout } = await execAsync(
        `gh pr create --title ${escapeShellArg(title)} --body ${escapeShellArg(body)} --base main`,
        {
          cwd: this.ROOT_PATH,
        },
      );

      const prUrlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);

      const result: { success: boolean; prUrl?: string; error?: string } = {
        success: true,
      };
      if (prUrlMatch) result.prUrl = prUrlMatch[0];
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // --------------------------------------------------------------------------
  // Config Insertion
  // --------------------------------------------------------------------------

  /**
   * Get path to store-registry config.ts
   */
  static getConfigPath(): string {
    return join(this.STORE_REGISTRY_DIR, 'src', 'config.ts');
  }

  /**
   * Insert a store config into config.ts
   */
  static async insertStoreConfig(
    storeId: string,
    storeName: string,
    domain: string,
    patterns: GeneratedPattern[],
  ): Promise<{ success: boolean; filePath: string; error?: string }> {
    const configPath = this.getConfigPath();

    try {
      // Read current config
      const content = await readFile(configPath, 'utf8');

      // Find the closing of mutableStoreConfigs array
      // Look for the pattern: },\n]; at the end of the array
      const arrayEndPattern = /(\s*},)\s*\n(\];)\s*\n\nexport const storeConfigs/;
      const match = content.match(arrayEndPattern);

      if (!match) {
        return {
          success: false,
          filePath: configPath,
          error:
            'Could not find insertion point in config.ts. Expected pattern: "},\\n];" before "export const storeConfigs"',
        };
      }

      // Generate the new store config
      const newConfig = this.generateStoreConfig(storeId, storeName, domain, patterns);

      // Insert the new config before the closing ];
      const insertionPoint = match.index! + match[1]!.length;
      const newContent =
        content.slice(0, insertionPoint) + '\n' + newConfig + content.slice(insertionPoint);

      // Write updated config
      await writeFile(configPath, newContent, 'utf8');

      return {
        success: true,
        filePath: configPath,
      };
    } catch (error) {
      return {
        success: false,
        filePath: configPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check required imports exist in config.ts and add if missing
   */
  static async ensureConfigImports(
    requiredImports: string[],
  ): Promise<{ success: boolean; added: string[]; error?: string }> {
    const configPath = this.getConfigPath();
    const added: string[] = [];

    try {
      let content = await readFile(configPath, 'utf8');

      // Find the existing import statement
      const importMatch = content.match(/import \{([^}]+)\} from 'ts-regex-builder';/);
      if (!importMatch) {
        return {
          success: false,
          added: [],
          error: 'Could not find ts-regex-builder import statement',
        };
      }

      const existingImports = importMatch[1]!.split(',').map((s) => s.trim());

      // Check which imports are missing
      const missingImports = requiredImports.filter((imp) => !existingImports.includes(imp));

      if (missingImports.length > 0) {
        // Add missing imports
        const allImports = [...existingImports, ...missingImports].sort();
        const newImportStatement = `import {\n  ${allImports.join(',\n  ')},\n} from 'ts-regex-builder';`;

        content = content.replace(/import \{[^}]+\} from 'ts-regex-builder';/, newImportStatement);
        await writeFile(configPath, content, 'utf8');
        added.push(...missingImports);
      }

      return {
        success: true,
        added,
      };
    } catch (error) {
      return {
        success: false,
        added: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================================================
// MCP Tool Registration
// ============================================================================

export function registerStoreOnboardingTools(server: McpServer) {
  createCheckStoreExistsTool(server);
  createValidateStoreMetadataTool(server);
  createFilterUrlsTool(server);
  createAnalyzeUrlsTool(server);
  createGeneratePatternsTool(server);
  createInsertConfigTool(server);
  createGenerateFixtureTool(server);
  createAppendFixtureTool(server);
  createRunTestsTool(server);
  createRunRegressionTestsTool(server);
  createCommitAndPushTool(server);
}

function createCheckStoreExistsTool(server: McpServer) {
  return server.tool(
    'store_check_exists',
    'Check if a store already exists in the store-registry by ID or domain, and if a test fixture exists',
    {
      state: z.object({
        storeId: z.string().optional().describe('Store ID to check'),
        domain: z.string().optional().describe('Domain to check'),
      }),
    },
    async ({ state }) => {
      if (!state.storeId && !state.domain) {
        return {
          content: [{ type: 'text', text: 'Error: Must provide either storeId or domain' }],
        };
      }

      const result = await StoreOnboardingManager.checkStoreExists(state.storeId, state.domain);

      // Also check for existing fixture if domain is provided
      let fixtureExists = false;
      let fixturePath: string | undefined;
      if (state.domain) {
        fixtureExists = await StoreOnboardingManager.fixtureExists(state.domain);
        if (fixtureExists) {
          fixturePath = StoreOnboardingManager.getFixturePath(state.domain);
        }
      }

      let response = '## Store Check Results\n\n';

      // Config status
      response += '### Store Registry Config\n';
      if (result.exists) {
        response += `**Status:** ✓ Store config exists\n`;
        if (result.existingById) {
          response += `- Found by ID: ${result.existingStoreId}\n`;
        }
        if (result.existingByDomain) {
          response += `- Found by domain: ${result.existingDomain}\n`;
        }
      } else {
        response += `**Status:** ✗ No store config found\n`;
      }

      // Fixture status
      response += '\n### Test Fixture\n';
      if (fixtureExists) {
        response += `**Status:** ✓ Fixture exists\n`;
        response += `- Path: ${fixturePath}\n`;
        response += `\n**Important:** Since a fixture exists, generic rules may already work!\n`;
        response += `Run \`store_run_tests\` first to check if a store-specific config is needed.\n`;
      } else {
        response += `**Status:** ✗ No fixture found\n`;
      }

      // Recommendation
      response += '\n### Recommendation\n';
      if (result.exists && fixtureExists) {
        response += `Store is fully configured. Use \`store_append_fixture\` to add more test cases.\n`;
      } else if (!result.exists && fixtureExists) {
        response += `⚠️ Fixture exists without store config - generic rules may work!\n`;
        response += `1. First run \`store_run_tests\` to verify generic rules work\n`;
        response += `2. If tests pass, no store config needed - just append new test cases\n`;
        response += `3. If tests fail, then generate a store-specific config\n`;
      } else if (result.exists && !fixtureExists) {
        response += `Store config exists but no fixture. Create a fixture with \`store_generate_fixture\`.\n`;
      } else {
        response += `New store. Proceed with full onboarding workflow.\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createValidateStoreMetadataTool(server: McpServer) {
  return server.tool(
    'store_validate_metadata',
    'Validate store ID and domain format for new store onboarding',
    {
      state: z.object({
        storeId: z.string().describe('Numeric store ID (e.g., "5246")'),
        domain: z.string().describe('Store domain (e.g., "example.com")'),
      }),
    },
    async ({ state }) => {
      const idValidation = StoreOnboardingManager.validateStoreId(state.storeId);
      const domainValidation = StoreOnboardingManager.validateDomain(state.domain);

      const errors: string[] = [];
      if (!idValidation.valid) {
        errors.push(`Store ID: ${idValidation.error}`);
      }
      if (!domainValidation.valid) {
        errors.push(`Domain: ${domainValidation.error}`);
      }

      if (errors.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Validation failed:\n${errors.map((e) => `- ${e}`).join('\n')}`,
            },
          ],
        };
      }

      // Also check if store exists
      const existsCheck = await StoreOnboardingManager.checkStoreExists(
        state.storeId,
        state.domain,
      );

      // Check for existing fixture
      const fixtureExists = await StoreOnboardingManager.fixtureExists(state.domain);

      let response = `Validation passed!\n- Store ID: ${state.storeId}\n- Domain: ${state.domain}`;

      if (existsCheck.exists) {
        response += `\n\n**Note:** Store config already exists in registry.`;
        if (existsCheck.existingById) {
          response += `\n- Found by ID: ${existsCheck.existingStoreId}`;
        }
        if (existsCheck.existingByDomain) {
          response += `\n- Found by domain: ${existsCheck.existingDomain}`;
        }
        response += `\nYou can use update mode to add new patterns.`;
      }

      if (fixtureExists) {
        response += `\n\n**Fixture Status:** ✓ Test fixture exists for ${state.domain}`;
        if (!existsCheck.exists) {
          response += `\n⚠️ Fixture exists but no store config - generic rules may already work!`;
          response += `\nRun \`store_run_tests\` first to check if a store-specific config is needed.`;
        }
      } else {
        response += `\n\n**Fixture Status:** ✗ No test fixture found`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createFilterUrlsTool(server: McpServer) {
  return server.tool(
    'store_filter_urls',
    'Filter a list of URLs to remove non-product pages (cart, category, account, etc.)',
    {
      state: z.object({
        urls: z.array(z.string()).describe('List of URLs to filter (5-50 recommended)'),
        domain: z.string().optional().describe('Expected domain to validate URLs against'),
      }),
    },
    async ({ state }) => {
      if (state.urls.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No URLs provided' }],
        };
      }

      if (state.urls.length > MAX_URLS_PER_REQUEST) {
        return {
          content: [{ type: 'text', text: `Error: Maximum ${MAX_URLS_PER_REQUEST} URLs allowed` }],
        };
      }

      // Deduplicate first
      const uniqueUrls = StoreOnboardingManager.deduplicateUrls(state.urls);
      const { productUrls, filteredUrls, warnings } = StoreOnboardingManager.filterUrls(
        uniqueUrls,
        state.domain,
      );

      let response = `## URL Filtering Results\n\n`;
      response += `**Input:** ${state.urls.length} URLs\n`;
      response += `**Unique:** ${uniqueUrls.length} URLs\n`;
      response += `**Product URLs:** ${productUrls.length}\n`;
      response += `**Filtered Out:** ${filteredUrls.length}\n\n`;

      if (productUrls.length > 0) {
        response += `### Product URLs (${productUrls.length})\n`;
        response += productUrls.map((u) => `- ${u}`).join('\n');
        response += '\n\n';
      }

      if (filteredUrls.length > 0) {
        response += `### Filtered URLs (${filteredUrls.length})\n`;
        response += filteredUrls.map((f) => `- ${f.url}\n  Reason: ${f.explanation}`).join('\n');
        response += '\n\n';
      }

      if (warnings.length > 0) {
        response += `### Warnings\n`;
        response += warnings.map((w) => `- ${w}`).join('\n');
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createAnalyzeUrlsTool(server: McpServer) {
  return server.tool(
    'store_analyze_urls',
    'Analyze product URLs to identify product ID patterns',
    {
      state: z.object({
        urls: z.array(z.string()).describe('List of product URLs to analyze'),
      }),
    },
    async ({ state }) => {
      if (state.urls.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No URLs provided' }],
        };
      }

      const { results, patterns, warnings } = StoreOnboardingManager.analyzeUrls(state.urls);

      let response = `## URL Pattern Analysis\n\n`;
      response += `**URLs Analyzed:** ${results.length}\n\n`;

      // Show identified patterns
      if (patterns.length > 0) {
        response += `### Identified Patterns (${patterns.length})\n\n`;
        for (const pattern of patterns) {
          response += `**Pattern: ${pattern.description}**\n`;
          response += `- Type: ${pattern.type}\n`;
          response += `- Format: ${pattern.format}\n`;
          response += `- Confidence: ${pattern.confidence}\n`;
          response += `- Example IDs: ${pattern.exampleIds.slice(0, 3).join(', ')}\n`;
          response += `- Example URLs:\n`;
          response += pattern.exampleUrls.map((u) => `  - ${u}`).join('\n');
          response += '\n\n';
        }
      } else {
        response += `### No patterns identified\n\n`;
      }

      // Show per-URL results
      response += `### Per-URL Results\n\n`;
      for (const result of results) {
        const icon = result.extractedIds.length > 0 ? '✓' : '✗';
        response += `${icon} ${result.originalUrl}\n`;
        if (result.extractedIds.length > 0) {
          response += `   → IDs: [${result.extractedIds.join(', ')}] (${result.confidence})\n`;
          response += `   → ${result.patternDescription}\n`;
        } else {
          response += `   → ${result.patternDescription}\n`;
        }
      }

      if (warnings.length > 0) {
        response += `\n### Warnings\n`;
        response += warnings.map((w) => `- ${w}`).join('\n');
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createGeneratePatternsTool(server: McpServer) {
  return server.tool(
    'store_generate_patterns',
    'Generate ts-regex-builder code for identified patterns',
    {
      state: z.object({
        urls: z.array(z.string()).describe('Product URLs that were analyzed'),
        storeId: z.string().describe('Store ID'),
        storeName: z.string().describe('Store name'),
        domain: z.string().describe('Store domain'),
      }),
    },
    async ({ state }) => {
      const { patterns } = StoreOnboardingManager.analyzeUrls(state.urls);

      if (patterns.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No patterns identified from URLs' }],
        };
      }

      const generatedPatterns = patterns.map((p) => StoreOnboardingManager.generatePatternCode(p));

      const configCode = StoreOnboardingManager.generateStoreConfig(
        state.storeId,
        state.storeName,
        state.domain,
        generatedPatterns,
      );

      let response = `## Generated Store Configuration\n\n`;
      response += `Add this to \`packages/store-registry/src/config.ts\`:\n\n`;
      response += '```typescript\n';
      response += configCode;
      response += '\n```\n\n';

      response += `### Generated Patterns (${generatedPatterns.length})\n\n`;
      for (const pattern of generatedPatterns) {
        response += `**${pattern.type} pattern:**\n`;
        response += `${pattern.comment}\n`;
        response += '```typescript\n';
        response += pattern.tsRegexBuilderCode;
        response += '\n```\n';
        response += `Raw regex: \`${pattern.rawRegex}\`\n\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createInsertConfigTool(server: McpServer) {
  return server.tool(
    'store_insert_config',
    'Insert generated store config into packages/store-registry/src/config.ts',
    {
      state: z.object({
        urls: z.array(z.string()).describe('Product URLs to analyze for patterns'),
        storeId: z.string().describe('Store ID'),
        storeName: z.string().describe('Store name'),
        domain: z.string().describe('Store domain'),
      }),
    },
    async ({ state }) => {
      // First analyze URLs to get patterns
      const { patterns, warnings } = StoreOnboardingManager.analyzeUrls(state.urls);

      if (patterns.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: No patterns identified from URLs.\n\nWarnings:\n${warnings.join('\n')}`,
            },
          ],
        };
      }

      // Generate pattern code
      const generatedPatterns = patterns.map((p) => StoreOnboardingManager.generatePatternCode(p));

      // Insert into config.ts
      const result = await StoreOnboardingManager.insertStoreConfig(
        state.storeId,
        state.storeName,
        state.domain,
        generatedPatterns,
      );

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Error inserting config: ${result.error}` }],
        };
      }

      let response = `## Config Inserted Successfully\n\n`;
      response += `**File:** ${result.filePath}\n`;
      response += `**Store:** ${state.storeName} (${state.storeId})\n`;
      response += `**Domain:** ${state.domain}\n`;
      response += `**Patterns:** ${generatedPatterns.length}\n\n`;

      response += `### Next Steps\n`;
      response += `1. Run \`store_generate_fixture\` to create test cases\n`;
      response += `2. Run \`store_run_tests\` to verify extraction works\n`;
      response += `3. Run \`store_run_regression_tests\` to check for regressions\n`;

      if (warnings.length > 0) {
        response += `\n### Warnings\n${warnings.map((w) => `- ${w}`).join('\n')}`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createGenerateFixtureTool(server: McpServer) {
  return server.tool(
    'store_generate_fixture',
    'Generate a product-id-extractor test fixture from analyzed URLs',
    {
      state: z.object({
        urls: z.array(z.string()).describe('Product URLs with identified IDs'),
        storeId: z.string().describe('Store ID'),
        storeName: z.string().describe('Store name'),
        domain: z.string().describe('Store domain'),
        writeFile: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to write the fixture file'),
      }),
    },
    async ({ state }) => {
      const { results } = StoreOnboardingManager.analyzeUrls(state.urls);

      // Create test cases from analysis results - use ORIGINAL URL for realistic fixtures
      const testCases: FixtureTestCase[] = [];
      for (const result of results) {
        if (result.extractedIds.length > 0) {
          testCases.push({
            url: result.originalUrl,
            expectedSkus: result.extractedIds.map((id) => id.toLowerCase()),
          });
        }
      }

      if (testCases.length === 0) {
        return {
          content: [
            { type: 'text', text: 'Error: No test cases could be generated (no IDs extracted)' },
          ],
        };
      }

      const fixtureContent = StoreOnboardingManager.generateFixture(
        state.storeName,
        state.storeId,
        state.domain,
        testCases,
      );

      // Check if store config exists
      const configExists = await StoreOnboardingManager.checkStoreExists(
        state.storeId,
        state.domain,
      );
      const hasStoreConfig = configExists.exists;

      let response = `## Generated Fixture\n\n`;
      response += `**Store:** ${state.storeName} (${state.storeId})\n`;
      response += `**Domain:** ${state.domain}\n`;
      response += `**Test Cases:** ${testCases.length}\n`;
      response += `**Store Config:** ${hasStoreConfig ? '✓ Exists' : '✗ Not configured'}\n\n`;

      if (state.writeFile) {
        const filePath = await StoreOnboardingManager.writeFixture(state.domain, fixtureContent);
        response += `**File written:** ${filePath}\n\n`;

        // Add next steps based on whether store config exists
        response += `### Next Steps\n`;
        if (!hasStoreConfig) {
          response += `⚠️ **Important:** No store config exists yet.\n`;
          response += `1. **First run \`store_run_tests\`** to check if generic rules work\n`;
          response += `2. If tests pass → No store config needed! Generic rules work.\n`;
          response += `3. If tests fail → Run \`store_generate_patterns\` to create store config\n`;
        } else {
          response += `1. Run \`store_run_tests\` to verify extraction works\n`;
          response += `2. Run \`store_run_regression_tests\` to check for regressions\n`;
        }
        response += '\n';
      }

      response += '```json\n';
      response += fixtureContent;
      response += '\n```';

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createAppendFixtureTool(server: McpServer) {
  return server.tool(
    'store_append_fixture',
    'Append new test cases to an existing fixture (for updating stores with additional URLs)',
    {
      state: z.object({
        urls: z.array(z.string()).describe('New product URLs to add to the fixture'),
        domain: z.string().describe('Store domain (must have existing fixture)'),
      }),
    },
    async ({ state }) => {
      // Check if fixture exists
      const exists = await StoreOnboardingManager.fixtureExists(state.domain);
      if (!exists) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: No fixture exists for ${state.domain}. Use store_generate_fixture for new stores.`,
            },
          ],
        };
      }

      // Analyze URLs to get test cases
      const { results } = StoreOnboardingManager.analyzeUrls(state.urls);

      // Create test cases from analysis results
      const newTestCases: FixtureTestCase[] = [];
      for (const result of results) {
        if (result.extractedIds.length > 0) {
          newTestCases.push({
            url: result.originalUrl,
            expectedSkus: result.extractedIds.map((id) => id.toLowerCase()),
          });
        }
      }

      if (newTestCases.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No test cases could be generated (no IDs extracted from URLs)',
            },
          ],
        };
      }

      // Append to fixture
      const appendResult = await StoreOnboardingManager.appendToFixture(state.domain, newTestCases);

      if (!appendResult.success) {
        return {
          content: [{ type: 'text', text: `Error appending to fixture: ${appendResult.error}` }],
        };
      }

      let response = `## Fixture Updated\n\n`;
      response += `**Domain:** ${state.domain}\n`;
      response += `**File:** ${appendResult.filePath}\n`;
      response += `**New test cases added:** ${appendResult.added}\n`;
      response += `**Duplicates skipped:** ${appendResult.duplicates}\n\n`;

      if (appendResult.added > 0) {
        response += `### Added Test Cases\n`;
        for (const tc of newTestCases.slice(0, appendResult.added)) {
          response += `- ${tc.url}\n`;
          response += `  → IDs: [${tc.expectedSkus.join(', ')}]\n`;
        }
        response += `\n### Next Steps\n`;
        response += `1. Run \`store_run_tests\` to verify extraction works\n`;
        response += `2. Run \`store_run_regression_tests\` to check for regressions\n`;
      } else {
        response += `All URLs were already in the fixture.`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createRunTestsTool(server: McpServer) {
  return server.tool(
    'store_run_tests',
    'Run product-id-extractor tests for a specific store fixture to check if generic rules work',
    {
      state: z.object({
        domain: z.string().describe('Store domain to test'),
      }),
    },
    async ({ state }) => {
      // Check if store config exists
      const configExists = await StoreOnboardingManager.checkStoreExists(undefined, state.domain);
      const hasStoreConfig = configExists.exists;

      const result = await StoreOnboardingManager.runFixtureTests(state.domain);

      let response = `## Test Results for ${state.domain}\n\n`;
      response += `**Status:** ${result.success ? '✓ PASSED' : '✗ FAILED'}\n`;
      response += `**Store Config:** ${hasStoreConfig ? '✓ Exists' : '✗ Not configured'}\n`;
      response += `**Passing:** ${result.passCount}\n`;
      response += `**Failing:** ${result.failCount}\n\n`;

      // Provide guidance based on results
      response += `### Analysis\n`;
      if (result.success && !hasStoreConfig) {
        response += `✅ **Generic rules work!** No store-specific config needed.\n`;
        response += `The built-in extraction patterns successfully extract IDs from this store's URLs.\n\n`;
        response += `**Next Steps:**\n`;
        response += `- You can append more test cases with \`store_append_fixture\`\n`;
        response += `- No need to run \`store_generate_patterns\` or modify config.ts\n`;
      } else if (result.success && hasStoreConfig) {
        response += `✅ Tests pass with store-specific config.\n\n`;
        response += `**Next Steps:**\n`;
        response += `- Run \`store_run_regression_tests\` before committing\n`;
      } else if (!result.success && !hasStoreConfig) {
        response += `❌ **Generic rules don't work** for this store.\n`;
        response += `A store-specific config is needed to extract IDs correctly.\n\n`;
        response += `**Next Steps:**\n`;
        response += `1. Run \`store_analyze_urls\` to identify patterns\n`;
        response += `2. Run \`store_generate_patterns\` to create config code\n`;
        response += `3. Run tests again to verify the config works\n`;
      } else {
        response += `❌ Tests fail even with store config. Config may need adjustment.\n\n`;
        response += `**Next Steps:**\n`;
        response += `- Review the failing test cases\n`;
        response += `- Update the store config patterns\n`;
      }

      response += `\n### Output\n\`\`\`\n${result.output}\n\`\`\``;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createRunRegressionTestsTool(server: McpServer) {
  return server.tool(
    'store_run_regression_tests',
    'Run all product-id-extractor tests to check for regressions',
    {},
    async () => {
      const result = await StoreOnboardingManager.runAllTests();

      let response = `## Regression Test Results\n\n`;
      response += `**Status:** ${result.success ? '✓ ALL PASSED' : '✗ FAILURES DETECTED'}\n`;
      response += `**Passing:** ${result.passCount}\n`;
      response += `**Failing:** ${result.failCount}\n\n`;

      if (!result.success) {
        response += `### ⚠️ Regression detected!\n`;
        response += `Some existing store tests are failing. Do not commit until all tests pass.\n\n`;
      }

      response += `### Output\n\`\`\`\n${result.output.slice(0, MAX_OUTPUT_LENGTH)}${result.output.length > MAX_OUTPUT_LENGTH ? '\n...(truncated)' : ''}\n\`\`\``;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}

function createCommitAndPushTool(server: McpServer) {
  return server.tool(
    'store_commit_and_push',
    'Commit store config changes, push to remote, and create a PR',
    {
      state: z.object({
        storeId: z.string().describe('Store ID'),
        storeName: z.string().describe('Store name'),
        domain: z.string().describe('Store domain'),
        createBranch: z.boolean().optional().default(false).describe('Create a new feature branch'),
        createPr: z
          .boolean()
          .optional()
          .default(false)
          .describe('Create a pull request after pushing'),
      }),
    },
    async ({ state }) => {
      const configPath = StoreOnboardingManager.getConfigPath();
      const fixturePath = StoreOnboardingManager.getFixturePath(state.domain);

      let response = `## Git Workflow\n\n`;

      // Step 0: Check git status for conflicts
      response += `### Step 0: Checking Git Status\n`;
      const gitStatus = await StoreOnboardingManager.checkGitStatus();

      if (gitStatus.hasConflicts) {
        response += `**Status:** ✗ CONFLICTS DETECTED\n\n`;
        response += `⚠️ **Git conflicts must be resolved before proceeding.**\n\n`;
        response += `**Conflicting files:**\n`;
        response += gitStatus.conflictFiles.map((f) => `- ${f}`).join('\n');
        response += `\n\n**Resolution steps:**\n`;
        response += `1. Open conflicting files and resolve markers (<<<<<<<, =======, >>>>>>>)\n`;
        response += `2. Stage resolved files: \`git add <file>\`\n`;
        response += `3. Run this tool again\n`;
        return {
          content: [{ type: 'text', text: response }],
        };
      }

      response += `**Status:** ✓ No conflicts\n\n`;

      // Step 1: Run regression tests first
      response += `### Step 1: Running Regression Tests\n`;
      const testResult = await StoreOnboardingManager.runAllTests();

      if (!testResult.success) {
        response += `**Status:** ✗ FAILED\n\n`;
        if (testResult.timedOut) {
          response += `⚠️ **Test execution timed out!** Cannot proceed with commit.\n`;
          response += `Tests may be hanging. Try running manually: \`pnpm --filter @rr/product-id-extractor test\`\n\n`;
        } else {
          response += `⚠️ **Regression detected!** Cannot proceed with commit.\n`;
          response += `Fix failing tests before committing.\n\n`;
          response += `Failing tests: ${testResult.failCount}\n`;
        }
        return {
          content: [{ type: 'text', text: response }],
        };
      }

      response += `**Status:** ✓ All ${testResult.passCount} tests passed\n\n`;

      // Step 2: Create branch if requested
      if (state.createBranch) {
        response += `### Step 2: Creating Branch\n`;
        const branchResult = await StoreOnboardingManager.createBranch(state.storeName);

        if (!branchResult.success) {
          response += `**Status:** ✗ Failed to create branch\n`;
          response += `Error: ${branchResult.error}\n\n`;
          response += `Branch may already exist. Continuing on current branch...\n\n`;
        } else {
          response += `**Branch:** ${branchResult.branchName}\n\n`;
        }
      }

      // Step 3: Stage files
      response += `### Step 3: Staging Files\n`;
      const stageResult = await StoreOnboardingManager.stageFiles([configPath, fixturePath]);

      if (!stageResult.success) {
        response += `**Status:** ✗ Failed to stage files\n`;
        response += `Error: ${stageResult.error}\n`;
        return {
          content: [{ type: 'text', text: response }],
        };
      }

      response += `**Files staged:**\n`;
      response += `- ${configPath}\n`;
      response += `- ${fixturePath}\n\n`;

      // Step 4: Create commit
      response += `### Step 4: Creating Commit\n`;
      const commitResult = await StoreOnboardingManager.createCommit(
        state.storeName,
        state.storeId,
        false,
      );

      if (!commitResult.success) {
        response += `**Status:** ✗ Failed to commit\n`;
        response += `Error: ${commitResult.error}\n`;
        return {
          content: [{ type: 'text', text: response }],
        };
      }

      response += `**Commit created:** feat(store-registry): add ${state.storeName} (${state.storeId}) store configuration\n\n`;

      // Step 5: Push and create PR if requested
      if (state.createPr) {
        response += `### Step 5: Push & Create PR\n`;

        // Note: Patterns not available in commit/push tool - PR body will be generic
        const branchName = `feat/store-${state.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-config`;

        const prResult = await StoreOnboardingManager.pushAndCreatePR(
          branchName,
          state.storeName,
          state.storeId,
          [], // No patterns available - use store_generate_patterns before committing for better PR description
          false,
        );

        if (!prResult.success) {
          response += `**Status:** ✗ Failed to push/create PR\n`;
          response += `Error: ${prResult.error}\n`;
          response += `\nYou can manually push with: \`git push -u origin HEAD\`\n`;
        } else {
          response += `**PR Created:** ${prResult.prUrl || 'Check GitHub for PR link'}\n`;
        }
      } else {
        response += `### Next Steps\n`;
        response += `Run \`git push\` to push changes to remote.\n`;
      }

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}
