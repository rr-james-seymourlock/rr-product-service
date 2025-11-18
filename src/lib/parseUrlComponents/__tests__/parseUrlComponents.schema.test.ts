import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  urlInputSchema,
  urlComponentsSchema,
  hostnameSchema,
  baseKeySchema,
  publicUrlSchema,
} from '../parseUrlComponents.schema';

describe('urlInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid HTTP URLs', () => {
      const result = urlInputSchema.parse('http://example.com');
      expect(result).toBe('http://example.com');
    });

    it('should accept valid HTTPS URLs', () => {
      const result = urlInputSchema.parse('https://example.com');
      expect(result).toBe('https://example.com');
    });

    it('should accept URLs with paths', () => {
      const result = urlInputSchema.parse('https://example.com/path/to/resource');
      expect(result).toBe('https://example.com/path/to/resource');
    });

    it('should accept URLs with query parameters', () => {
      const result = urlInputSchema.parse('https://example.com/path?query=value');
      expect(result).toBe('https://example.com/path?query=value');
    });

    it('should accept URLs with ports', () => {
      const result = urlInputSchema.parse('https://example.com:8080/path');
      expect(result).toBe('https://example.com:8080/path');
    });

    it('should accept URLs with subdomains', () => {
      const result = urlInputSchema.parse('https://www.subdomain.example.com');
      expect(result).toBe('https://www.subdomain.example.com');
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-string values', () => {
      expect(() => urlInputSchema.parse(123)).toThrow(ZodError);
      expect(() => urlInputSchema.parse(null)).toThrow(ZodError);
      expect(() => urlInputSchema.parse(undefined)).toThrow(ZodError);
      expect(() => urlInputSchema.parse({})).toThrow(ZodError);
      expect(() => urlInputSchema.parse([])).toThrow(ZodError);
    });

    it('should reject empty strings', () => {
      expect(() => urlInputSchema.parse('')).toThrow(ZodError);
      expect(() => urlInputSchema.parse('')).toThrow('URL cannot be empty');
    });

    it('should reject invalid URL formats', () => {
      expect(() => urlInputSchema.parse('not a url')).toThrow(ZodError);
      expect(() => urlInputSchema.parse('ht!tp://example.com')).toThrow(ZodError);
      expect(() => urlInputSchema.parse('://example.com')).toThrow(ZodError);
    });

    it('should reject non-HTTP(S) protocols', () => {
      expect(() => urlInputSchema.parse('javascript:alert(1)')).toThrow(ZodError);
      expect(() => urlInputSchema.parse('javascript:alert(1)')).toThrow(
        'Only HTTP(S) protocols are allowed',
      );
    });

    it('should reject data: protocol', () => {
      expect(() => urlInputSchema.parse('data:text/html,<script>alert(1)</script>')).toThrow(
        ZodError,
      );
      expect(() => urlInputSchema.parse('data:text/html,<script>alert(1)</script>')).toThrow(
        'Only HTTP(S) protocols are allowed',
      );
    });

    it('should reject file: protocol', () => {
      expect(() => urlInputSchema.parse('file:///etc/passwd')).toThrow(ZodError);
      expect(() => urlInputSchema.parse('file:///etc/passwd')).toThrow(
        'Only HTTP(S) protocols are allowed',
      );
    });

    it('should reject ftp: protocol', () => {
      expect(() => urlInputSchema.parse('ftp://example.com')).toThrow(ZodError);
      expect(() => urlInputSchema.parse('ftp://example.com')).toThrow(
        'Only HTTP(S) protocols are allowed',
      );
    });
  });

  describe('error messages', () => {
    it('should provide clear error message for non-string input', () => {
      const result = urlInputSchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 returns "Invalid input: expected string, received null" for type errors
        expect(result.error.issues[0].message).toContain('expected string');
      }
    });

    it('should provide clear error message for empty string', () => {
      const result = urlInputSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('URL cannot be empty');
      }
    });

    it('should provide clear error message for invalid URL format', () => {
      const result = urlInputSchema.safeParse('not a url');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid URL');
      }
    });

    it('should provide clear error message for invalid protocol', () => {
      const result = urlInputSchema.safeParse('javascript:alert(1)');
      expect(result.success).toBe(false);
      if (!result.success) {
        const lastIssue = result.error.issues[result.error.issues.length - 1];
        expect(lastIssue.message).toBe('Only HTTP(S) protocols are allowed');
      }
    });
  });
});

describe('urlComponentsSchema', () => {
  const validComponents = {
    href: 'https://example.com/path',
    encodedHref: encodeURIComponent('https://example.com/path'),
    hostname: 'example.com',
    pathname: '/path',
    search: '?query=value',
    domain: 'example.com',
    key: 'abc123defg456789', // Exactly 16 characters
    original: 'https://example.com/path?query=value',
  };

  describe('valid inputs', () => {
    it('should accept valid URL components', () => {
      const result = urlComponentsSchema.parse(validComponents);
      expect(result).toEqual(validComponents);
    });

    it('should accept components with empty search', () => {
      const components = { ...validComponents, search: '' };
      const result = urlComponentsSchema.parse(components);
      expect(result).toEqual(components);
    });

    it('should accept components with root pathname', () => {
      const components = { ...validComponents, pathname: '/' };
      const result = urlComponentsSchema.parse(components);
      expect(result).toEqual(components);
    });

    it('should accept keys with hyphens and underscores', () => {
      const components = { ...validComponents, key: 'a1B2-C3D4_e5F6g7' };
      const result = urlComponentsSchema.parse(components);
      expect(result.key).toBe('a1B2-C3D4_e5F6g7');
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid href (not a URL)', () => {
      const invalid = { ...validComponents, href: 'not a url' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject empty encodedHref', () => {
      const invalid = { ...validComponents, encodedHref: '' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject empty hostname', () => {
      const invalid = { ...validComponents, hostname: '' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject empty domain', () => {
      const invalid = { ...validComponents, domain: '' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject keys with wrong length', () => {
      const invalid = { ...validComponents, key: 'short' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
      expect(() => urlComponentsSchema.parse(invalid)).toThrow('exactly 16 characters');
    });

    it('should reject keys with invalid characters', () => {
      const invalid = { ...validComponents, key: 'abc123!@#$%^&*()' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject missing required fields', () => {
      const { href, ...incomplete } = validComponents;
      expect(() => urlComponentsSchema.parse(incomplete)).toThrow(ZodError);
    });

    it('should reject empty original URL', () => {
      const invalid = { ...validComponents, original: '' };
      expect(() => urlComponentsSchema.parse(invalid)).toThrow(ZodError);
    });
  });
});

describe('hostnameSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid hostnames', () => {
      expect(hostnameSchema.parse('example.com')).toBe('example.com');
      expect(hostnameSchema.parse('www.example.com')).toBe('www.example.com');
      expect(hostnameSchema.parse('subdomain.example.co.uk')).toBe('subdomain.example.co.uk');
    });

    it('should accept IP addresses', () => {
      expect(hostnameSchema.parse('192.168.1.1')).toBe('192.168.1.1');
      expect(hostnameSchema.parse('127.0.0.1')).toBe('127.0.0.1');
    });

    it('should accept localhost', () => {
      expect(hostnameSchema.parse('localhost')).toBe('localhost');
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-string values', () => {
      expect(() => hostnameSchema.parse(123)).toThrow(ZodError);
      expect(() => hostnameSchema.parse(null)).toThrow(ZodError);
      expect(() => hostnameSchema.parse(undefined)).toThrow(ZodError);
    });

    it('should reject empty strings', () => {
      expect(() => hostnameSchema.parse('')).toThrow(ZodError);
      expect(() => hostnameSchema.parse('')).toThrow('Hostname cannot be empty');
    });
  });

  describe('error messages', () => {
    it('should provide clear error message for empty hostname', () => {
      const result = hostnameSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Hostname cannot be empty');
      }
    });
  });
});

describe('baseKeySchema', () => {
  describe('valid inputs', () => {
    it('should accept non-empty strings', () => {
      expect(baseKeySchema.parse('example.com/path')).toBe('example.com/path');
      expect(baseKeySchema.parse('nike.com/product/123')).toBe('nike.com/product/123');
    });

    it('should accept empty strings', () => {
      // baseKeySchema allows empty strings (min: 0)
      expect(baseKeySchema.parse('')).toBe('');
    });

    it('should accept strings with special characters', () => {
      expect(baseKeySchema.parse('example.com/path?query=value')).toBe(
        'example.com/path?query=value',
      );
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-string values', () => {
      expect(() => baseKeySchema.parse(123)).toThrow(ZodError);
      expect(() => baseKeySchema.parse(null)).toThrow(ZodError);
      expect(() => baseKeySchema.parse(undefined)).toThrow(ZodError);
      expect(() => baseKeySchema.parse({})).toThrow(ZodError);
      expect(() => baseKeySchema.parse([])).toThrow(ZodError);
    });
  });

  describe('error messages', () => {
    it('should provide clear error message for non-string input', () => {
      const result = baseKeySchema.safeParse(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 returns "Invalid input: expected string, received null" for type errors
        expect(result.error.issues[0].message).toContain('expected string');
      }
    });
  });
});

describe('publicUrlSchema', () => {
  describe('valid inputs', () => {
    it('should accept public HTTP(S) URLs', () => {
      expect(publicUrlSchema.parse('https://example.com')).toBe('https://example.com');
      expect(publicUrlSchema.parse('http://google.com')).toBe('http://google.com');
    });

    it('should accept URLs with public IP addresses', () => {
      expect(publicUrlSchema.parse('https://8.8.8.8')).toBe('https://8.8.8.8');
      expect(publicUrlSchema.parse('https://1.1.1.1')).toBe('https://1.1.1.1');
    });
  });

  describe('invalid inputs - blocked hostnames', () => {
    it('should reject localhost', () => {
      expect(() => publicUrlSchema.parse('https://localhost')).toThrow(ZodError);
      expect(() => publicUrlSchema.parse('https://localhost/path')).toThrow('public address');
    });

    it('should reject 127.0.0.1', () => {
      expect(() => publicUrlSchema.parse('https://127.0.0.1')).toThrow(ZodError);
      expect(() => publicUrlSchema.parse('https://127.0.0.1/path')).toThrow('public address');
    });

    it('should reject 0.0.0.0', () => {
      expect(() => publicUrlSchema.parse('https://0.0.0.0')).toThrow(ZodError);
    });

    it('should reject ::1 (IPv6 localhost)', () => {
      expect(() => publicUrlSchema.parse('https://[::1]')).toThrow(ZodError);
    });
  });

  describe('invalid inputs - private IP ranges', () => {
    it('should reject 10.x.x.x range', () => {
      expect(() => publicUrlSchema.parse('https://10.0.0.1')).toThrow(ZodError);
      expect(() => publicUrlSchema.parse('https://10.255.255.255')).toThrow(ZodError);
    });

    it('should reject 192.168.x.x range', () => {
      expect(() => publicUrlSchema.parse('https://192.168.1.1')).toThrow(ZodError);
      expect(() => publicUrlSchema.parse('https://192.168.255.255')).toThrow(ZodError);
    });

    it('should reject 172.16-31.x.x range', () => {
      expect(() => publicUrlSchema.parse('https://172.16.0.1')).toThrow(ZodError);
      expect(() => publicUrlSchema.parse('https://172.31.255.255')).toThrow(ZodError);
    });

    it('should reject AWS metadata IP (169.254.x.x)', () => {
      expect(() => publicUrlSchema.parse('https://169.254.169.254')).toThrow(ZodError);
      expect(() => publicUrlSchema.parse('https://169.254.169.254/latest/meta-data')).toThrow(
        'public address',
      );
    });
  });

  describe('error messages', () => {
    it('should provide clear error message for private addresses', () => {
      const result = publicUrlSchema.safeParse('https://localhost');
      expect(result.success).toBe(false);
      if (!result.success) {
        const lastIssue = result.error.issues[result.error.issues.length - 1];
        expect(lastIssue.message).toContain('public address');
        expect(lastIssue.message).toContain('private IP ranges are not allowed');
      }
    });
  });
});
