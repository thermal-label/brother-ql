import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Resolve the workspace dep directly to its source so tests don't
  // depend on a fresh `dist/` build. Without this alias, vitest reads
  // through the package's `exports.import` (`../core/dist/index.js`)
  // and any registry change requires `pnpm -r run build` before
  // tests pick it up.
  resolve: {
    alias: {
      '@thermal-label/brother-ql-core': fileURLToPath(
        new URL('../core/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
