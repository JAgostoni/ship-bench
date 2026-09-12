import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Iteration 2 owns the pure-logic layer only, so `include` is scoped to
      // `src/lib/**`. `src/server/**` returns to this list in iteration 3,
      // together with its repository tests and the `'src/server/**'` glob
      // threshold at the §11.1 integration target (≥85%).
      include: ['src/lib/**'],
      thresholds: {
        // `architecture.md` §11.2 global entry, verbatim and at full strength.
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        // §11.1's unit-layer target for `src/lib/**` (≥90%), enforced as a glob
        // so it keeps applying once iteration 3 widens `include`.
        'src/lib/**': { lines: 90, functions: 90, branches: 70, statements: 90 },
      },
    },
    // Vitest 5 replaced `environmentMatchGlobs` (and the workspace file) with
    // `projects`. Two projects let node tests and jsdom component tests coexist
    // in one `vitest run`.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/lib/**/*.test.ts', 'src/server/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['src/components/**/*.test.tsx'],
        },
      },
    ],
  },
});
