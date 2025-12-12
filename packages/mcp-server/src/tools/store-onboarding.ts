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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

/** Confidence level for pattern analysis */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Location where product ID was found in URL */
export type IdLocation = 'pathname' | 'search_param';

/** Format of the product ID */
export type IdFormat = 'numeric' | 'alphanumeric' | 'prefixed' | 'uuid' | 'unknown';

/** Workflow mode - new store or updating existing */
export type WorkflowMode = 'new' | 'update';

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

/** Store onboarding workflow state */
export interface StoreOnboardingState {
  // Store metadata
  storeId: string;
  storeName: string;
  domain: string;

  // Workflow mode
  mode: WorkflowMode;

  // URL analysis
  rawUrls: string[];
  productUrls: string[];
  filteredUrls: FilteredUrl[];
  analysisResults: UrlAnalysisResult[];
  identifiedPatterns: IdentifiedPattern[];

  // Generated artifacts
  generatedPatterns: GeneratedPattern[];
  fixtureTestCases: FixtureTestCase[];

  // Workflow state
  currentStep:
    | 'init'
    | 'urls_collected'
    | 'urls_filtered'
    | 'analyzed'
    | 'confirmed'
    | 'generated'
    | 'tested'
    | 'committed';
  errors: string[];
  warnings: string[];
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

      // Check by store ID
      if (storeId) {
        const idPattern = new RegExp(`id:\\s*['"]${storeId}['"]`, 'i');
        existingById = idPattern.test(configContent);
        if (existingById) {
          foundStoreId = storeId;
        }
      }

      // Check by domain
      if (domain) {
        const domainPattern = new RegExp(`domain:\\s*['"]${domain}['"]`, 'i');
        existingByDomain = domainPattern.test(configContent);
        if (existingByDomain) {
          foundDomain = domain;
        }
      }

      return {
        exists: existingById || existingByDomain,
        existingById,
        existingByDomain,
        existingStoreId: foundStoreId,
        existingDomain: foundDomain,
      };
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
    if (productUrls.length < 5) {
      warnings.push(
        `Only ${productUrls.length} product URLs remaining after filtering. ` +
          `Minimum 5 recommended for pattern confidence.`,
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

    return {
      originalUrl: url,
      normalizedUrl,
      extractedIds,
      idLocation,
      idFormat,
      confidence,
      patternDescription,
      pathSegmentIndex,
      searchParamName,
    };
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
        patternGroups.set(key, {
          results: [],
          type: result.idLocation,
          format: result.idFormat,
          pathSegmentFromEnd: result.pathSegmentIndex,
          searchParamName: result.searchParamName,
        });
      }

      patternGroups.get(key)!.results.push(result);
    }

    // Convert to identified patterns
    const patterns: IdentifiedPattern[] = [];

    for (const [, group] of patternGroups) {
      const urlCount = group.results.length;
      const totalUrls = urls.length;
      const coverage = urlCount / totalUrls;

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

      patterns.push({
        type: group.type,
        description,
        confidence,
        format: group.format,
        pathSegmentFromEnd: group.pathSegmentFromEnd,
        searchParamName: group.searchParamName,
        exampleUrls: group.results.slice(0, 3).map((r) => r.normalizedUrl),
        exampleIds: group.results.slice(0, 3).flatMap((r) => r.extractedIds),
      });
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
  }> {
    try {
      // Set LOG_LEVEL=error to suppress debug logs during tests
      const { stdout, stderr } = await execAsync(
        `LOG_LEVEL=error pnpm --filter @rr/product-id-extractor test -- --grep "${domain}"`,
        { cwd: this.ROOT_PATH },
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
      return {
        success: false,
        output: this.filterTestOutput(rawOutput),
        passCount: 0,
        failCount: 1,
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
  }> {
    try {
      // Set LOG_LEVEL=error to suppress debug logs during tests
      const { stdout, stderr } = await execAsync(
        `LOG_LEVEL=error pnpm --filter @rr/product-id-extractor test`,
        { cwd: this.ROOT_PATH },
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
      return {
        success: false,
        output: this.filterTestOutput(rawOutput),
        passCount: 0,
        failCount: 1,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Git Workflow
  // --------------------------------------------------------------------------

  /**
   * Create a feature branch for the store
   */
  static async createBranch(
    storeName: string,
  ): Promise<{ success: boolean; branchName: string; error?: string }> {
    const branchName = `feat/store-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-config`;

    try {
      await execAsync(`git checkout -b ${branchName}`, { cwd: this.ROOT_PATH });
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
      await execAsync(`git add ${files.join(' ')}`, { cwd: this.ROOT_PATH });
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
      await execAsync(`git commit -m "${message}"`, { cwd: this.ROOT_PATH });
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
      // Push branch
      await execAsync(`git push -u origin ${branchName}`, { cwd: this.ROOT_PATH });

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

      const { stdout } = await execAsync(
        `gh pr create --title "${title}" --body "${body}" --base main`,
        {
          cwd: this.ROOT_PATH,
        },
      );

      const prUrlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);

      return {
        success: true,
        prUrl: prUrlMatch ? prUrlMatch[0] : undefined,
      };
    } catch (error) {
      return {
        success: false,
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
  createGenerateFixtureTool(server);
  createRunTestsTool(server);
  createRunRegressionTestsTool(server);
}

function createCheckStoreExistsTool(server: McpServer) {
  return server.tool(
    'store_check_exists',
    'Check if a store already exists in the store-registry by ID or domain',
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

      let response = '';
      if (result.exists) {
        response = `Store already exists:\n`;
        if (result.existingById) {
          response += `- Found by ID: ${result.existingStoreId}\n`;
        }
        if (result.existingByDomain) {
          response += `- Found by domain: ${result.existingDomain}\n`;
        }
        response += `\nUse update mode to add new patterns to this store.`;
      } else {
        response = `Store does not exist. You can proceed with new store onboarding.`;
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

      let response = `Validation passed!\n- Store ID: ${state.storeId}\n- Domain: ${state.domain}`;

      if (existsCheck.exists) {
        response += `\n\nNote: Store already exists in registry.`;
        if (existsCheck.existingById) {
          response += `\n- Found by ID: ${existsCheck.existingStoreId}`;
        }
        if (existsCheck.existingByDomain) {
          response += `\n- Found by domain: ${existsCheck.existingDomain}`;
        }
        response += `\nYou can use update mode to add new patterns.`;
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

      if (state.urls.length > 50) {
        return {
          content: [{ type: 'text', text: 'Error: Maximum 50 URLs allowed' }],
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

      let response = `## Generated Fixture\n\n`;
      response += `**Store:** ${state.storeName} (${state.storeId})\n`;
      response += `**Domain:** ${state.domain}\n`;
      response += `**Test Cases:** ${testCases.length}\n\n`;

      if (state.writeFile) {
        const filePath = await StoreOnboardingManager.writeFixture(state.domain, fixtureContent);
        response += `**File written:** ${filePath}\n\n`;
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

function createRunTestsTool(server: McpServer) {
  return server.tool(
    'store_run_tests',
    'Run product-id-extractor tests for a specific store fixture',
    {
      state: z.object({
        domain: z.string().describe('Store domain to test'),
      }),
    },
    async ({ state }) => {
      const result = await StoreOnboardingManager.runFixtureTests(state.domain);

      let response = `## Test Results for ${state.domain}\n\n`;
      response += `**Status:** ${result.success ? '✓ PASSED' : '✗ FAILED'}\n`;
      response += `**Passing:** ${result.passCount}\n`;
      response += `**Failing:** ${result.failCount}\n\n`;
      response += `### Output\n\`\`\`\n${result.output}\n\`\`\``;

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

      response += `### Output\n\`\`\`\n${result.output.slice(0, 2000)}${result.output.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\``;

      return {
        content: [{ type: 'text', text: response }],
      };
    },
  );
}
