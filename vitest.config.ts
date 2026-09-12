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
      // §11.2's `include`, restored to its full scope now that iteration 3
      // supplies the repository integration tests that cover `src/server/**`.
      // `src/test/**` is deliberately absent: the harness and factories are
      // test scaffolding, not application code.
      include: ['src/lib/**', 'src/server/**'],
      thresholds: {
        // `architecture.md` §11.2 global entry, verbatim and at full strength.
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        // §11.1's unit-layer target for `src/lib/**` (≥90%).
        'src/lib/**': { lines: 90, functions: 90, branches: 70, statements: 90 },
        // §11.1's integration-layer target for `src/server/**` (≥85%).
        'src/server/**': { lines: 85, functions: 85, branches: 70, statements: 85 },
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
          // `src/test/**` holds the DB harness (db.ts) and its own spec, which
          // must run alongside the repository tests that depend on it.
          // `src/app/**` covers route handlers, which are Node code with no
          // request-time Next.js API surface (iteration 4's `/api/health`).
          include: [
            'src/lib/**/*.test.ts',
            'src/server/**/*.test.ts',
            'src/test/**/*.test.ts',
            'src/app/**/*.test.ts',
          ],
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
