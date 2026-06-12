// Direct access to the E2E database (data/kb-e2e.sqlite) from the test-runner
// process. The web server under test holds the same file open; SQLite WAL mode
// makes cross-process reads/writes safe, so specs can reset state between
// tests without restarting the server. Only row contents are touched here —
// the file itself is created and migrated by e2e/global-setup.ts, and is never
// deleted while the server may have it open (Windows would refuse anyway).
import path from "node:path";
import Database from "better-sqlite3";
import { seedRows } from "../src/lib/seed-data";

export const E2E_DATABASE_PATH = path.join("data", "kb-e2e.sqlite");

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(path.resolve(E2E_DATABASE_PATH));
  db.pragma("busy_timeout = 5000");
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

/**
 * Restore the canonical 12 seed articles, replacing whatever is in the table.
 * The FTS5 triggers from the initial migration keep the search index in sync.
 */
export function resetToSeed(): void {
  withDb((db) => {
    const insert = db.prepare(
      "INSERT INTO articles (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
    );
    db.transaction(() => {
      db.prepare("DELETE FROM articles").run();
      for (const row of seedRows(Date.now())) {
        insert.run(row.title, row.content, row.createdAt, row.updatedAt);
      }
    })();
  });
}

/** Empty the articles table — the zero-articles state for the empty-state spec. */
export function wipeArticles(): void {
  withDb((db) => {
    db.prepare("DELETE FROM articles").run();
  });
}
