import mbtech from '@mbtech-nl/eslint-config';
export default [
  // Global ignores must be a standalone config object
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/vitest.config.ts'],
  },
  ...mbtech,
  {
    // import-x/consistent-type-specifier-style (prefer-inline) and
    // @typescript-eslint/no-import-type-side-effects conflict — prefer-inline wins.
    rules: {
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },
  {
    // CLI source files intentionally use console for user-facing output.
    files: ['packages/cli/src/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
