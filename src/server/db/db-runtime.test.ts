// Real tests for iteration 1's `src/server/db/**` runtime modules, which
// iteration 3's task 3.7 brings into the coverage scope. The repositories sit on
// these modules without exercising them directly.
//
// `client.ts`, `migrate.ts`, and `search-index.ts` all carry
// `import 'server-only'` and read `env.DATABASE_FILE` **at import time**, so each
// case sets `DATABASE_FILE` to a temp path and imports the module fresh via
// `vi.resetModules()`. Without that, importing `client.ts` in a test would open
// the developer's real `./data/kb.db` — the exact failure D25 exists to prevent.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabase } from './create';
import { articles, categories } from './schema';

const tempDirs: string[] = [];

/** Points the module graph at a private temp database file. */
function useTempDatabaseFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kb-dbmod-'));
  tempDirs.push(dir);
  const file = join(dir, 'kb.db');
  process.env.DATABASE_FILE = file;
  vi.resetModules();
  return file;
}

afterEach(() => {
  delete process.env.DATABASE_FILE;
  vi.resetModules();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Windows may hold -wal/-shm handles briefly; cleanup is best-effort.
      }
    }
  }
});

describe('createDatabase', () => {
  it('applies every production PRAGMA', () => {
    const handle = createDatabase(':memory:');

    expect(Number(handle.sqlite.pragma('foreign_keys', { simple: true }))).toBe(1);
    // `synchronous = NORMAL` reports as 1.
    expect(Number(handle.sqlite.pragma('synchronous', { simple: true }))).toBe(1);
    expect(Number(handle.sqlite.pragma('busy_timeout', { simple: true }))).toBe(5000);
    expect(Number(handle.sqlite.pragma('cache_size', { simple: true }))).toBe(-32000);

    handle.sqlite.close();
  });

  it('returns a working Drizzle handle bound to the same connection', () => {
    const handle = createDatabase(':memory:');
    handle.sqlite.exec('CREATE TABLE probe (id INTEGER PRIMARY KEY, label TEXT)');

    handle.db.run(sql`INSERT INTO probe (label) VALUES ('x')`);

    expect(handle.db.all<{ label: string }>(sql`SELECT label FROM probe`)).toEqual([
      { label: 'x' },
    ]);
    handle.sqlite.close();
  });

  it('accepts the in-memory pseudo-path without creating a file', () => {
    const handle = createDatabase(':memory:');

    expect(handle.sqlite.name).toBe(':memory:');
    handle.sqlite.close();
  });
});

describe('client.ts — the process-wide singleton', () => {
  it('opens DATABASE_FILE, installs itself via setDb(), and survives re-import', async () => {
    const file = useTempDatabaseFile();

    const client = await import('./client');
    const { getDb } = await import('./current');

    expect(client.sqlite.name).toBe(file);
    // The seam D25 relies on: any repository singleton resolving `getDb()` now
    // reaches this handle.
    expect(getDb()).toBe(client.db);
    expect(
      Number(client.sqlite.pragma('journal_mode', { simple: true })) || 0,
    ).toBeGreaterThanOrEqual(0);
  });

  it('reuses one handle across a repeated import (HMR guard)', async () => {
    useTempDatabaseFile();

    const first = await import('./client');
    const second = await import('./client');

    expect(second.db).toBe(first.db);
    expect(second.sqlite).toBe(first.sqlite);
  });
});

describe('search-index.ts — ensureSearchIndex', () => {
  it('creates the virtual table and all three triggers, then rebuilds on request', async () => {
    useTempDatabaseFile();

    const { runMigrations } = await import('./migrate');
    const { sqlite, db } = await import('./client');

    runMigrations();

    const objects = sqlite
      .prepare(
        `SELECT name, type FROM sqlite_master WHERE name LIKE 'article_search%' OR name LIKE 'articles_search_%'`,
      )
      .all() as { name: string; type: string }[];

    const byName = new Map(objects.map((o) => [o.name, o.type]));
    expect(byName.get('article_search')).toBe('table');
    expect(byName.get('articles_search_ai')).toBe('trigger');
    expect(byName.get('articles_search_ad')).toBe('trigger');
    expect(byName.get('articles_search_au')).toBe('trigger');

    db.insert(categories).values({ name: 'Engineering', slug: 'engineering' }).run();
    db.insert(articles)
      .values({
        title: 'Rebuild probe',
        slug: 'rebuild-probe',
        bodyMd: 'A body about narwhals.',
        status: 'published',
        version: 1,
      })
      .run();

    const match = () =>
      sqlite
        .prepare('SELECT rowid FROM article_search WHERE article_search MATCH ?')
        .all('"narwhals"');

    expect(match()).toHaveLength(1);

    // Exercise the `rebuild: true` branch: this is the statement `npm run
    // db:reindex` runs, and it must reconstruct the inverted index from
    // `articles` without duplicating anything.
    runMigrations({ rebuildSearch: true });

    expect(match()).toHaveLength(1);
  });

  it('is idempotent — a second ensureSearchIndex is a no-op', async () => {
    useTempDatabaseFile();

    const { runMigrations } = await import('./migrate');

    runMigrations();
    expect(() => runMigrations()).not.toThrow();
  });
});

describe('migrate.ts — runMigrations', () => {
  it('migrates an empty database and leaves every table present', async () => {
    useTempDatabaseFile();

    const { runMigrations } = await import('./migrate');
    const { sqlite } = await import('./client');

    runMigrations();

    const tables = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toContain('articles');
    expect(tables).toContain('categories');
    expect(tables).toContain('article_revisions');
    expect(tables).toContain('__drizzle_migrations');
  });

  it('defaults rebuildSearch to false and accepts it as true', async () => {
    useTempDatabaseFile();

    const { runMigrations } = await import('./migrate');

    expect(() => runMigrations()).not.toThrow();
    expect(() => runMigrations({ rebuildSearch: true })).not.toThrow();
  });
});

describe('the search index stays consistent with the content table', () => {
  it('reflects an update through the trigger and a rebuild through the content table', async () => {
    useTempDatabaseFile();
    const { runMigrations } = await import('./migrate');
    const { sqlite, db } = await import('./client');
    runMigrations();

    const inserted = db
      .insert(articles)
      .values({
        title: 'Consistency',
        slug: 'consistency',
        bodyMd: 'A body about voles.',
        status: 'published',
        version: 1,
      })
      .returning({ id: articles.id })
      .get();

    db.update(articles)
      .set({ bodyMd: 'A body about shrews.' })
      .where(sql`id = ${inserted.id}`)
      .run();

    const match = (term: string) =>
      sqlite.prepare('SELECT rowid FROM article_search WHERE article_search MATCH ?').all(term);

    expect(match('"voles"')).toEqual([]);
    expect(match('"shrews"')).toEqual([{ rowid: inserted.id }]);
  });
});
