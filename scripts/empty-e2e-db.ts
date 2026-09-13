// Empties the E2E database for `e2e/empty-states.spec.ts`.
//
// Run: `npx tsx scripts/empty-e2e-db.ts [--categories]`
//
// This lives in `scripts/**` because that is the only place outside `src/server/**`
// the ESLint config permits importing `better-sqlite3` from (architecture.md §4 item
// 1: the driver stays behind the server boundary). The Playwright helper shells out
// to it rather than widening that rule for a test file.
//
// **The database file is never taken from the environment.** It is fixed to
// `./data/kb.e2e.db` — the file `playwright.config.ts`'s `webServer` uses — so a
// stray invocation cannot delete a developer's `kb.db`. The `--categories` flag
// additionally empties the category table, which is what the "No categories yet"
// state needs.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/server/db/create';

const TARGET = './data/kb.e2e.db';
const absolute = resolve(process.cwd(), TARGET);

if (!existsSync(absolute)) {
  console.error(`Refusing to run: no E2E database at ${absolute}.`);
  process.exit(1);
}

const withCategories = process.argv.includes('--categories');
const { sqlite, db } = createDatabase(absolute);

try {
  // `createDatabase` sets `foreign_keys = ON`, which is what makes the delete
  // cascade into `article_revisions`; the FTS5 delete trigger keeps `article_search`
  // consistent with the emptied table.
  db.run(sql`DELETE FROM articles`);
  if (withCategories) db.run(sql`DELETE FROM categories`);

  const articles = db.get<{ n: number }>(sql`SELECT count(*) AS n FROM articles`)?.n ?? 0;
  const categories = db.get<{ n: number }>(sql`SELECT count(*) AS n FROM categories`)?.n ?? 0;
  console.log(`Emptied ${TARGET}: ${articles} articles, ${categories} categories.`);
} finally {
  sqlite.close();
}
