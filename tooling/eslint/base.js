import js from '@eslint/js';
import turbo from 'eslint-config-turbo';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', '.turbo/**', 'coverage/**', '.serverless/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...turbo,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
