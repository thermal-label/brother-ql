import mbtech from '@mbtech-nl/eslint-config';
export default [
  // Global ignores must be a standalone config object
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/vitest.config.ts'],
  },
  ...mbtech,
  {
    // import-x/consistent-type-specifier-style (prefer-inline) and
    // @typescript-eslint/no-import-type-side-effects conflict — prefer-inline wins.
    rules: {
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },
];
