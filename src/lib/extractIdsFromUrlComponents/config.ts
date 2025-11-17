import {
  buildRegExp,
  capture,
  repeat,
  digit,
  word,
  optional,
  wordBoundary,
  choiceOf,
  endOfString,
} from 'ts-regex-builder';

const PATTERN_EXTRACTOR_MAX_RESULTS = 12; // Decreasing this will effect tests
const PATTERN_EXTRACTOR_TIMEOUT_MS = 100; // 100ms timeout

const searchPattern: RegExp = buildRegExp(
  [
    choiceOf('?', '&'),
    choiceOf('sku', 'pid', 'id', 'productid', 'skuid', 'athcpid', 'upc_id', 'variant', 'prdtno'),
    '=',
    capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })),
  ],
  { global: true },
);

const productIdPattern: RegExp = buildRegExp(
  [
    wordBoundary,
    capture([
      choiceOf('prod', 'prd', 'p'),
      optional('-'),
      capture(repeat(digit, { min: 6, max: 24 })),
    ]),
    wordBoundary,
  ],
  { global: true },
);

const numericEndPattern: RegExp = buildRegExp(
  [
    wordBoundary,
    choiceOf('/', '-'),
    capture([repeat(digit, { min: 6, max: 24 })]),
    optional('.html'),
    endOfString,
  ],
  { global: true },
);

const pathnamePatterns: RegExp[] = [productIdPattern, numericEndPattern];

export const config = {
  PATTERNS: {
    pathnamePatterns,
    searchPattern,
  },
  MAX_RESULTS: PATTERN_EXTRACTOR_MAX_RESULTS,
  TIMEOUT_MS: PATTERN_EXTRACTOR_TIMEOUT_MS,
};
