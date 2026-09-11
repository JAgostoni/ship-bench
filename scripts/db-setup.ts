import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase } from '../src/server/db/create';
import { FTS5_DDL } from '../src/server/db/search-index-ddl';
import { seed } from '../src/server/db/seed';

const flags = new Set(process.argv.slice(2));
const file = process.env.DATABASE_FILE ?? './data/kb.db';

mkdirSync(dirname(file), { recursive: true });

// tsx does not set the `react-server` condition, so this script uses the
// condition-free factory instead of src/server/db/client.ts.
const { sqlite, db } = createDatabase(file);

if (flags.has('--fresh')) {
  console.log('Dropping all tables…');
  sqlite.exec(`
    DROP TABLE IF EXISTS article_search;
    DROP TABLE IF EXISTS article_revisions;
    DROP TABLE IF EXISTS articles;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS __drizzle_migrations;
  `);
}

console.log('Applying migrations…');
migrate(db, { migrationsFolder: './drizzle' });
sqlite.exec(FTS5_DDL);
if (flags.has('--reindex')) {
  db.run(sql`INSERT INTO article_search(article_search) VALUES ('rebuild')`);
}

if (flags.has('--check')) {
  const integrity = db.get<{ integrity_check: string }>(sql`PRAGMA integrity_check`);
  const fk = db.all(sql`PRAGMA foreign_key_check`);
  console.log('integrity_check:', integrity?.integrity_check);
  console.log('foreign_key_check:', fk.length === 0 ? 'clean' : fk);
  const ok = integrity?.integrity_check === 'ok' && fk.length === 0;
  sqlite.close();
  process.exit(ok ? 0 : 1);
}

if (flags.has('--seed') || flags.has('--fresh')) {
  console.log('Seeding…');
  seed(db);
}

console.log('Database ready at', file);
sqlite.close();
