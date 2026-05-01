import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Resolve the workspace dep directly to its source so tests don't
  // depend on a fresh `dist/` build. See packages/node/vitest.config.ts
  // for the rationale.
  resolve: {
    alias: {
      '@thermal-label/brother-ql-core': fileURLToPath(
        new URL('../core/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/*.test.ts', 'src/__tests__/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
