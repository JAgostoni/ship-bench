// No `server-only` import here: this factory is imported by tsx scripts and by
// Vitest, neither of which sets the `react-server` export condition.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export function createDatabase(file: string) {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('cache_size = -32000'); // 32 MB page cache
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export type Database = ReturnType<typeof createDatabase>['db'];
