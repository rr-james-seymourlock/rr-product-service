import { z } from 'zod';

/**
 * Input validation schema for URL strings.
 *
 * Validates that:
 * - Input is a string
 * - String is not empty
 * - String is a valid URL format
 * - Protocol is HTTP or HTTPS (security: prevents javascript:, data:, file: protocols)
 *
 * @example
 * ```typescript
 * urlInputSchema.parse('https://example.com'); // ✓ Valid
 * urlInputSchema.parse('javascript:alert(1)'); // ✗ Throws ZodError
 * ```
 */
export const urlInputSchema = z
  .string({ message: 'URL must be a string' })
  .min(1, 'URL cannot be empty')
  .url({ message: 'Invalid URL format' })
  .refine(
    (url) => {
      try {
        const { protocol } = new URL(url);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'Only HTTP(S) protocols are allowed',
    },
  );

/**
 * Type inferred from urlInputSchema.
 * Represents a validated URL string.
 */
export type UrlInput = z.infer<typeof urlInputSchema>;

/**
 * Output validation schema for parsed URL components.
 *
 * Ensures the parseUrlComponents function returns correctly structured data:
 * - href: Valid normalized URL
 * - encodedHref: URL-encoded string
 * - hostname: Non-empty hostname
 * - pathname: URL path (can be empty string)
 * - search: Query string (can be empty string)
 * - domain: Normalized domain (non-empty)
 * - key: Exactly 16 characters, URL-safe format
 * - original: Original input URL
 *
 * @example
 * ```typescript
 * const result = {
 *   href: 'https://example.com/path',
 *   encodedHref: 'https%3A%2F%2Fexample.com%2Fpath',
 *   hostname: 'example.com',
 *   pathname: '/path',
 *   search: '?query=1',
 *   domain: 'example.com',
 *   key: 'xY9_kL3mN-pQ2wR_',
 *   original: 'https://example.com/path?query=1'
 * };
 * urlComponentsSchema.parse(result); // ✓ Valid
 * ```
 */
export const urlComponentsSchema = z.object({
  href: z.string().url({ message: 'Invalid normalized URL' }),
  encodedHref: z.string().min(1, 'Encoded href cannot be empty'),
  hostname: z.string().min(1, 'Hostname cannot be empty'),
  pathname: z.string(), // Can be empty string
  search: z.string(), // Can be empty string
  domain: z.string().min(1, 'Domain cannot be empty'),
  key: z
    .string()
    .length(16, 'URL key must be exactly 16 characters')
    .regex(
      /^[\w-]+$/,
      'URL key must contain only alphanumeric characters, underscores, and hyphens',
    ),
  original: z.string().min(1, 'Original URL cannot be empty'),
});

/**
 * Type inferred from urlComponentsSchema.
 * Represents the structured output of URL parsing.
 */
export type URLComponents = z.infer<typeof urlComponentsSchema>;

/**
 * Validation schema for hostname strings.
 *
 * Used by parseDomain function to validate input.
 *
 * @example
 * ```typescript
 * hostnameSchema.parse('example.com'); // ✓ Valid
 * hostnameSchema.parse(''); // ✗ Throws ZodError
 * ```
 */
export const hostnameSchema = z
  .string({ message: 'Hostname must be a string' })
  .min(1, 'Hostname cannot be empty');

/**
 * Type inferred from hostnameSchema.
 */
export type Hostname = z.infer<typeof hostnameSchema>;

/**
 * Validation schema for base key strings used in hash generation.
 *
 * Used by createUrlKey function to validate input before hashing.
 *
 * @example
 * ```typescript
 * baseKeySchema.parse('example.com/path'); // ✓ Valid
 * baseKeySchema.parse(null); // ✗ Throws ZodError
 * ```
 */
export const baseKeySchema = z.string({ message: 'Base key must be a string' }).min(0); // Can be empty string (will generate hash of empty string)

/**
 * Type inferred from baseKeySchema.
 */
export type BaseKey = z.infer<typeof baseKeySchema>;

/**
 * Optional: Public URL validation schema (blocks private/local IPs).
 *
 * Use this schema when you need to ensure URLs don't point to:
 * - localhost / 127.0.0.1
 * - Private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
 * - AWS metadata service (169.254.169.254)
 *
 * @example
 * ```typescript
 * publicUrlSchema.parse('https://example.com'); // ✓ Valid
 * publicUrlSchema.parse('https://localhost'); // ✗ Throws ZodError
 * publicUrlSchema.parse('https://192.168.1.1'); // ✗ Throws ZodError
 * ```
 */
const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

const PRIVATE_IP_REGEX = /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/;
const METADATA_IP_REGEX = /^169\.254\./;

export const publicUrlSchema = urlInputSchema.refine(
  (url) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Check blocked hostnames
      if (BLOCKED_HOSTNAMES.has(hostname)) {
        return false;
      }

      // Check private IP ranges
      if (PRIVATE_IP_REGEX.test(hostname)) {
        return false;
      }

      // Check AWS metadata IP
      if (METADATA_IP_REGEX.test(hostname)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },
  {
    message: 'URL must point to a public address (localhost and private IP ranges are not allowed)',
  },
);

/**
 * Type inferred from publicUrlSchema.
 */
export type PublicUrl = z.infer<typeof publicUrlSchema>;
