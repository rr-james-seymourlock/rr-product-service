import { createHash } from 'node:crypto';
import normalizeUrl from 'normalize-url';
import { config } from './config';

export interface URLComponents extends Pick<URL, 'href' | 'hostname' | 'pathname' | 'search'> {
  domain: string;
  key?: string;
  original?: string;
}

export const parseDomain = (hostname: string): string => {
  try {
    const hostnameParts = hostname.split('.');

    const baseDomain = config.MULTI_PART_TLDS.has(hostnameParts.slice(-2).join('.'))
      ? hostnameParts.slice(-3).join('.')
      : hostnameParts.slice(-2).join('.');

    const preservedSubdomain = hostnameParts.find((part): part is string =>
      config.PRESERVED_SUBDOMAINS.has(part)
    );

    // Return early if no preserved subdomain or if it's already in the base domain
    if (preservedSubdomain === undefined || baseDomain.includes(preservedSubdomain)) {
      return baseDomain;
    }

    return `${preservedSubdomain}.${baseDomain}`;
  } catch (error) {
    throw new Error(`Failed to parse domain for "${hostname}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const createUrlKey = (baseKey: string): string => {
  try {
    return createHash('sha1')
      .update(baseKey)
      .digest('base64')
      .slice(0, 16)
      .replace(/[+/=]/g, '_')
      .replace(/\//g, '-');
  } catch (error) {
    throw new Error(`Failed to create URL key for "${baseKey}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const parseUrlComponents = (url: string): URLComponents => {
  try {
    const normalized = normalizeUrl(url, config.NORMALIZATION_RULES).toLowerCase();
    const { href, hostname, pathname, search } = new URL(normalized);

    // Extract the domain removing subdomains and supporting multi part TLD's
    const domain = parseDomain(hostname);

    // Create a unique key per URL for use in Redis and for dynmoDB keys
    const baseKey = `${domain}${pathname}${search}`;
    const key = createUrlKey(baseKey);

    return {
      href,
      hostname,
      pathname,
      search,
      domain,
      key,
      original: url
    };
  } catch (error) {
    throw new Error(`Failed to parse URL components for "${url}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}