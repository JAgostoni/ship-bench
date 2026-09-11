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
      include: ['src/lib/**', 'src/server/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
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
