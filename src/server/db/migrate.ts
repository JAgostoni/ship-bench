import 'server-only';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import { ensureSearchIndex } from './search-index';

export function runMigrations({ rebuildSearch = false } = {}) {
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex({ rebuild: rebuildSearch });
}
