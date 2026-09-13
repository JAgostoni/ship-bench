import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db/current';
import { db, sqlite } from './client';
import { FTS5_DDL } from './search-index-ddl';

export { FTS5_DDL };

export function ensureSearchIndex({ rebuild = false } = {}) {
  // FTS5_DDL contains four statements (the virtual table plus three triggers).
  // better-sqlite3's `prepare()` rejects multi-statement SQL, so this must go
  // through the raw `exec()` rather than `db.run(sql.raw(...))`.
  sqlite.exec(FTS5_DDL);
  if (rebuild) db.run(sql`INSERT INTO article_search(article_search) VALUES ('rebuild')`);
}

/**
 * Rebuilds the FTS5 index from `articles` (`architecture.md` §8.8's
 * `npm run db:reindex`).
 *
 * It lives here, beside the DDL, because it is the same concern: the FTS5 virtual table
 * is created and recovered by this module and by nothing else. A caller that needs an
 * index rebuild — `POST /api/test/reset` after a bulk re-seed, or a future admin
 * endpoint — asks for the behaviour rather than writing the `INSERT ... ('rebuild')`
 * incantation itself, which is also what keeps the `drizzle-orm` restricted-import rule
 * satisfied everywhere outside `src/server/**`.
 *
 * It resolves its handle through `getDb()` rather than the `client.ts` singleton so it
 * works in a Vitest process, where no server has booted and no `client.ts` module has
 * been evaluated.
 */
export function rebuildSearchIndex(): void {
  getDb().run(sql`INSERT INTO article_search(article_search) VALUES ('rebuild')`);
}
