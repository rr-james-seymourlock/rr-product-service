import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import regexpPlugin from 'eslint-plugin-regexp';
import unicornPlugin from 'eslint-plugin-unicorn';
import sonarPlugin from 'eslint-plugin-sonarjs';
// @ts-expect-error - no types available
import importPlugin from 'eslint-plugin-import';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.serverless/**',
      '.esbuild/**',
      'coverage/**',
      '.vscode/**',
      '.git/**',
      '.DS_Store',
      '.env',
      '.env.local',
      'src/**/*.test.{js,mjs,cjs,ts}',
      'src/**/example.{js,ts}',
      // Config files (linted by their respective tools)
      '*.config.{ts,mts,cts}',
      'eslint.config.mts',
    ],
  },

  // Base config for all JavaScript files
  pluginJs.configs.recommended,

  // Config for JavaScript config files (not TypeScript source)
  {
    files: ['*.js', '*.mjs', '*.cjs', '.*.js', '.*.mjs', '.*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  // TypeScript-specific config (only for src files)
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      regexp: regexpPlugin,
      unicorn: unicornPlugin,
      sonarjs: sonarPlugin,
      import: importPlugin,
    },
    rules: {
      // TypeScript ESLint - Strict Rules
      ...tseslint.configs.strictTypeChecked[0].rules,
      ...tseslint.configs.stylisticTypeChecked[0].rules,

      // TypeScript - Override specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'property',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          filter: {
            // Allow config object properties in UPPER_CASE
            regex: '^(PATTERNS|MAX_RESULTS|TIMEOUT_MS|NORMALIZATION_RULES|PRESERVED_SUBDOMAINS|PATHNAME_EXTENSIONS)$',
            match: true,
          },
        },
        {
          selector: 'property',
          format: null, // No format requirement
          filter: {
            // Allow @context and @type for JSON-LD
            regex: '^@',
            match: true,
          },
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],

      // SonarJS - Code Smell Detection
      ...sonarPlugin.configs.recommended.rules,
      'sonarjs/cognitive-complexity': ['error', 35], // Increased for complex ID extraction logic
      'sonarjs/no-duplicate-string': ['error', { threshold: 5 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-alphabetical-sort': 'off', // Product IDs are ASCII, don't need locale compare
      'sonarjs/no-ignored-return': 'off', // Allow in benchmarks and tests
      'sonarjs/hashing': 'off', // SHA-1 is fine for non-cryptographic URL keys
      'sonarjs/no-clear-text-protocols': 'off', // JSON-LD schemas use http URIs

      // Unicorn - Modern Best Practices
      'unicorn/better-regex': 'error',
      'unicorn/catch-error-name': 'error',
      'unicorn/consistent-destructuring': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/custom-error-definition': 'error',
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
        },
      ],
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/no-await-expression-member': 'error',
      'unicorn/no-console-spaces': 'error',
      'unicorn/no-for-loop': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-null': 'off', // TypeScript uses null
      'unicorn/no-thenable': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/number-literal-case': 'error',
      'unicorn/prefer-add-event-listener': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-dom-node-text-content': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-native-coercion-functions': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-query-selector': 'error',
      'unicorn/prefer-reflect-apply': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-switch': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          replacements: {
            props: false,
            ref: false,
            params: false,
            obj: false, // Allow 'obj' for object parameters
            args: false, // Allow 'args' for arguments
            env: false, // Allow 'env' for environment
          },
        },
      ],
      'unicorn/require-array-join-separator': 'error',
      'unicorn/require-number-to-fixed-digits-argument': 'error',
      'unicorn/throw-new-error': 'error',

      // Regexp - Safe and Optimized Patterns
      ...regexpPlugin.configs['flat/recommended'].rules,
      'regexp/no-contradiction-with-assertion': 'error',
      'regexp/no-control-character': 'error',
      'regexp/no-dupe-characters-character-class': 'error',
      'regexp/no-empty-alternative': 'error',
      'regexp/no-empty-capturing-group': 'error',
      'regexp/no-empty-character-class': 'error',
      'regexp/no-invalid-regexp': 'error',
      'regexp/no-lazy-ends': 'error',
      'regexp/no-misleading-capturing-group': 'error',
      'regexp/no-missing-g-flag': 'error',
      'regexp/no-super-linear-backtracking': 'error',
      'regexp/no-useless-assertions': 'error',
      'regexp/no-useless-backreference': 'error',
      'regexp/no-useless-dollar-replacements': 'error',
      'regexp/optimal-quantifier-concatenation': 'error',
      'regexp/prefer-character-class': 'error',
      'regexp/prefer-plus-quantifier': 'error',
      'regexp/prefer-question-quantifier': 'error',
      'regexp/prefer-star-quantifier': 'error',

      // Import - Better Import Management
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/newline-after-import': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // General Code Quality
      'no-console': 'off', // Lambda logging
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-useless-return': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: false,
          object: true,
        },
      ],
      'object-shorthand': ['error', 'always'],
      'prefer-object-spread': 'error',
      'no-param-reassign': 'error',
      'no-implicit-coercion': 'error',
    },
  },

  // Add globals for browser environment
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];

export default config;
