// Test-only database harness (architecture.md §11.2). Not `server-only`: this
// module is imported by Vitest only, and it deliberately bypasses
// `src/server/db/client.ts`, whose `import 'server-only'` throws outside the
// `react-server` export condition.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase } from '@/server/db/create';
import { setDb } from '@/server/db/current';
import { FTS5_DDL } from '@/server/db/search-index-ddl';

/**
 * Creates a fresh, fully migrated SQLite database in a private temp directory,
 * with the real FTS5 virtual table and its three triggers.
 *
 * Every call gets its own file, so no test can observe another test's rows, and
 * no test can reach `./data/kb.db` (D25). The returned handle is also installed
 * as the `getDb()` seam target so a repository singleton — if one is ever
 * touched by accident — resolves to this temp file rather than the developer's
 * real database.
 */
export function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), 'kb-test-'));
  const { sqlite, db } = createDatabase(join(dir, 'test.db'));
  migrate(db, { migrationsFolder: './drizzle' });
  sqlite.exec(FTS5_DDL); // real FTS5, real triggers
  setDb(db); // lets repository singletons resolve to this test handle
  return {
    db,
    sqlite,
    dir,
    close: () => {
      sqlite.close();
      // Windows holds the -wal/-shm handles until close() returns; a failed
      // cleanup must never fail a test.
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // The OS temp directory is cleaned up on its own schedule.
      }
    },
  };
}

/** The path a test must never touch: the developer's real database. */
export const REAL_DATABASE_FILE = join(process.cwd(), 'data', 'kb.db');

export { sql };
