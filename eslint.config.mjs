import baseConfig from '@rr/eslint-config/base.js';

export default [
  ...baseConfig,
  {
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
      'scripts/**',
    ],
  },
];
