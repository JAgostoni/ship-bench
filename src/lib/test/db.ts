import { afterEach, beforeEach } from "vitest";
import { closeDb } from "@/lib/db/client";

/**
 * Run every test in the calling suite against a fresh in-memory SQLite
 * database. The client singleton lazily reopens (and re-applies migrations,
 * including the FTS5 table and triggers) on the first getDb() of each test.
 */
export function setupInMemoryDb(): void {
  beforeEach(() => {
    closeDb();
    process.env.DATABASE_PATH = ":memory:";
  });

  afterEach(() => {
    closeDb();
    delete process.env.DATABASE_PATH;
  });
}
