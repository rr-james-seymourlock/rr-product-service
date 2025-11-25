import baseConfig from '@rr/eslint-config/base.js';

export default [
  ...baseConfig,
  {
    ignores: ['dist/**', '.aws-sam/**', 'esbuild.config.mjs'],
  },
];
