import 'server-only';
import { sql } from 'drizzle-orm';
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
