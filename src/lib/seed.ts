// Seed script: `npm run db:seed`.
// Inserts 12 sample knowledge-base articles, only if the table is empty —
// running it repeatedly never duplicates rows.
import { closeDb, getDb } from "./db/client";
import { articles } from "./db/schema";
import { seedRows } from "./seed-data";

function main(): void {
  const db = getDb();

  const existing = db.select({ id: articles.id }).from(articles).all();
  if (existing.length > 0) {
    console.log(
      `Seed skipped: database already contains ${existing.length} article(s).`,
    );
    return;
  }

  const rows = seedRows(Date.now());
  db.insert(articles).values(rows).run();
  console.log(
    `Seeded ${rows.length} articles into ${process.env.DATABASE_PATH || "data/kb.sqlite"}`,
  );
}

try {
  main();
  closeDb();
} catch (error) {
  console.error("Seed failed:", error);
  process.exit(1);
}
