// Empties the *screenshot* scratch database used by `scripts/screenshots.cjs`.
//
// Run: `npx tsx scripts/empty-scratch-db.ts [--categories]`
//
// Deliberately a separate script from `scripts/empty-e2e-db.ts`: that one is pinned
// to `./data/kb.e2e.db` so a stray invocation can never delete a developer's data,
// and the screenshot pass must not weaken that guarantee. This one is pinned to
// `./data/kb.shots.db` for the same reason — it is a database that exists only for
// the screenshot run and is deleted afterwards.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/server/db/create';

const TARGET = './data/kb.shots.db';
const absolute = resolve(process.cwd(), TARGET);

if (!existsSync(absolute)) {
  console.error(`Refusing to run: no screenshot database at ${absolute}.`);
  process.exit(1);
}

const withCategories = process.argv.includes('--categories');
const { sqlite, db } = createDatabase(absolute);

try {
  db.run(sql`DELETE FROM articles`);
  if (withCategories) db.run(sql`DELETE FROM categories`);
  const articles = db.get<{ n: number }>(sql`SELECT count(*) AS n FROM articles`)?.n ?? 0;
  const categories = db.get<{ n: number }>(sql`SELECT count(*) AS n FROM categories`)?.n ?? 0;
  console.log(`Emptied ${TARGET}: ${articles} articles, ${categories} categories.`);
} finally {
  sqlite.close();
}
