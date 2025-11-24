// Main function and type exports
export {
  parseUrlComponents,
  parseDomain,
  createUrlKey,
  type URLComponents,
} from './parseUrlComponents';

// Schema exports for advanced usage and validation
export {
  urlInputSchema,
  urlComponentsSchema,
  hostnameSchema,
  baseKeySchema,
  publicUrlSchema,
  type UrlInput,
  type Hostname,
  type BaseKey,
  type PublicUrl,
} from './parseUrlComponents.schema';
