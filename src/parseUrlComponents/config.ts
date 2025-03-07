import type { Options } from 'normalize-url';

const NORMALIZATION_RULES: Options = {
  defaultProtocol: 'https',
  forceHttps: true,
  normalizeProtocol: true,
  stripHash: true,
  stripWWW: true,
  stripProtocol: false,
  stripTextFragment: true,
  removeTrailingSlash: true,
  removeSingleSlash: true,
  removeExplicitPort: true,
  sortQueryParameters: true,
  removeQueryParameters: [
    // UTM and tracking parameters
    /^utm_\w+/,
    /^fb_\w+/,
    /^hsa_\w+/,
    '_ga',
    'gclid',
    'gclsrc',
    '_gl',
    'fbclid',
    'twclid',
    't',
    'msclkid',

    // Generic marketing parameters
    'ref',
    'referral',
    'source',
    'campaign',
    'medium',
    'content',
    'term',

    // Platform-specific parameters
    'igshid',
    'mc_cid',
    'mc_eid',
    '_hsenc',
    '_hsmi',
    '_kx',
    'zanpid',
    'affid',
    'aff_id',
    'affiliate',
    'cjevent'

  ]
}

const MULTI_PART_TLDS = new Set([
  'co.uk',
  'co.jp',
  'com.br',
  'com.au',
  'co.nz',
  'org.uk'
]);

const PRESERVED_SUBDOMAINS = new Set([
  'oldnavy',
  'bananarepublic',
  'athleta',
  'bananarepublicfactory',
  'gapfactory',
  'gap'
]);

const PATHNAME_EXTENSIONS = /\.(html?|php|asp|jsp|xml)$/;

export const config = {
  NORMALIZATION_RULES,
  MULTI_PART_TLDS,
  PRESERVED_SUBDOMAINS,
  PATHNAME_EXTENSIONS
}