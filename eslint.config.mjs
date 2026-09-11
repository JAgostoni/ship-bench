import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

/** Paths allowed to import the SQLite driver and the Drizzle query builder. */
const DB_LAYER = [
  // The only production code that may touch SQL or the driver.
  'src/server/db/**',
  'src/server/repositories/**',
  // Node-only code that never enters a client bundle: the db:* scripts and the
  // Vitest setup. architecture.md §14.1 requires db-setup.ts to import both.
  'scripts/**',
  'src/test/**',
];

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'drizzle/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...next,
  {
    // Structural rule (architecture.md §4 item 1, D26): all SQL and the
    // driver stay behind the server-only boundary. Importing either package
    // from a component, route, or lib module fails the build instead of
    // silently pulling the driver into a client bundle.
    files: ['**/*.{ts,tsx,mjs}'],
    ignores: DB_LAYER,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'better-sqlite3',
              message:
                'Import better-sqlite3 only from src/server/db/** or src/server/repositories/**.',
            },
            {
              name: 'drizzle-orm',
              message:
                'Import drizzle-orm only from src/server/db/** or src/server/repositories/**.',
            },
          ],
          patterns: [
            {
              group: ['drizzle-orm/*', 'drizzle-orm/**'],
              message:
                'Import drizzle-orm only from src/server/db/** or src/server/repositories/**.',
            },
          ],
        },
      ],
    },
  },
);
