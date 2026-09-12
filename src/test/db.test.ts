// Task 3.1: proves the harness itself is correct before any repository test
// relies on it (iteration-3.md 3.1, architecture.md §11.2).
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, REAL_DATABASE_FILE } from './db';

type TestDb = ReturnType<typeof createTestDb>;

/** Windows paths are case-insensitive; compare them that way on every platform. */
const normalize = (value: string) => resolve(value).toLowerCase();

const TABLES = ['categories', 'articles', 'article_revisions'];
const FTS_OBJECTS = [
  'article_search',
  'articles_search_ai',
  'articles_search_ad',
  'articles_search_au',
];

describe('createTestDb', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  it('applies every migration, creating the three relational tables', () => {
    const names = handle.sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all()
      .map((row) => (row as { name: string }).name);

    for (const table of TABLES) {
      expect(names).toContain(table);
    }
  });

  it('bootstraps the FTS5 virtual table and all three sync triggers', () => {
    const objects = handle.sqlite
      .prepare(
        `SELECT name, type FROM sqlite_master WHERE name IN (${FTS_OBJECTS.map(() => '?').join(', ')})`,
      )
      .all(...FTS_OBJECTS) as { name: string; type: string }[];

    expect(objects.map((o) => o.name).sort()).toEqual([...FTS_OBJECTS].sort());
    expect(objects.find((o) => o.name === 'article_search')?.type).toBe('table');
    for (const trigger of ['articles_search_ai', 'articles_search_ad', 'articles_search_au']) {
      expect(objects.find((o) => o.name === trigger)?.type).toBe('trigger');
    }
  });

  it('enables foreign keys, matching production PRAGMAs', () => {
    const foreignKeys = handle.sqlite.pragma('foreign_keys', { simple: true });
    expect(Number(foreignKeys)).toBe(1);
  });

  it('uses WAL journaling', () => {
    const journalMode = handle.sqlite.pragma('journal_mode', { simple: true });
    expect(String(journalMode).toLowerCase()).toBe('wal');
  });

  it('creates the database under os.tmpdir(), never ./data/kb.db', () => {
    const actual = normalize(handle.sqlite.name);

    expect(actual.startsWith(normalize(tmpdir()))).toBe(true);
    expect(dirname(actual)).not.toBe(normalize(dirname(REAL_DATABASE_FILE)));
    expect(actual).not.toBe(normalize(REAL_DATABASE_FILE));
  });

  it('gives each call its own file, so tests cannot observe one another', () => {
    const other = createTestDb();
    try {
      expect(normalize(other.sqlite.name)).not.toBe(normalize(handle.sqlite.name));
    } finally {
      other.close();
    }
  });

  it('installs the temp handle as the getDb() seam target', async () => {
    const { getDb } = await import('@/server/db/current');
    expect(getDb()).toBe(handle.db);
  });
});

describe('the developer database is untouched by the harness', () => {
  it('leaves ./data/kb.db byte-identical after two consecutive runs', () => {
    let before: { size: number; mtimeMs: number } | undefined;
    try {
      const stats = statSync(REAL_DATABASE_FILE);
      before = { size: stats.size, mtimeMs: stats.mtimeMs };
    } catch {
      // A clean checkout has no ./data/kb.db at all, which is the strongest
      // possible pass: nothing was created. Assert that it still does not exist.
      before = undefined;
    }

    createTestDb().close();
    createTestDb().close();

    if (before === undefined) {
      expect(() => statSync(REAL_DATABASE_FILE)).toThrow();
      return;
    }

    const after = statSync(REAL_DATABASE_FILE);
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });
});
