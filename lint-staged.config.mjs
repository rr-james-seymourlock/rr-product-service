/**
 * @type {import('lint-staged').Config}
 */
const config = {
  '*.{js,ts}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};

export default config;
