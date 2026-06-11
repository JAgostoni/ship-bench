import { afterAll, beforeAll, expect, it } from "vitest";
import { closeDb, getDb, getSqlite } from "./client";

// Smoke test: the whole chain — open, migrate, FTS5 schema — works in-memory.
beforeAll(() => {
  process.env.DATABASE_PATH = ":memory:";
  getDb();
});

afterAll(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
});

it("creates the articles table and the articles_fts virtual table", () => {
  const tables = getSqlite()
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    )
    .all()
    .map((row) => row.name);

  expect(tables).toContain("articles");
  expect(tables).toContain("articles_fts");
});

it("creates the three FTS sync triggers", () => {
  const triggers = getSqlite()
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'trigger'",
    )
    .all()
    .map((row) => row.name);

  expect(triggers).toEqual(
    expect.arrayContaining(["articles_ai", "articles_ad", "articles_au"]),
  );
});
