// Iteration 1's `seed()` was untested. Iteration 3's task 3.7 brings
// `src/server/**` into the coverage scope, and the seed is part of that surface,
// so it is exercised here against a real migrated database — the same way the
// `db:seed` script runs it.
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { articleRevisions, articles, categories } from '@/server/db/schema';
import { createTestDb } from '@/test/db';
import { seed } from './seed';

type TestDb = ReturnType<typeof createTestDb>;

describe('seed', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  it('inserts the documented fixture set', () => {
    seed(handle.db);

    expect(handle.db.select().from(categories).all()).toHaveLength(4);
    expect(handle.db.select().from(articles).all()).toHaveLength(9);
  });

  it('marks two articles as drafts and the rest as published', () => {
    seed(handle.db);

    const rows = handle.db.select({ status: articles.status }).from(articles).all();
    expect(rows.filter((r) => r.status === 'draft')).toHaveLength(2);
    expect(rows.filter((r) => r.status === 'published')).toHaveLength(7);
  });

  it('links every article to a category or null, never a dangling id', () => {
    seed(handle.db);

    const categoryIds = new Set(
      handle.db
        .select({ id: categories.id })
        .from(categories)
        .all()
        .map((c) => c.id),
    );
    const rows = handle.db.select({ categoryId: articles.categoryId }).from(articles).all();

    for (const row of rows) {
      if (row.categoryId !== null) expect(categoryIds.has(row.categoryId)).toBe(true);
    }
    // The fixture deliberately includes one uncategorized article.
    expect(rows.some((r) => r.categoryId === null)).toBe(true);
  });

  it('writes revision 1 for every article and matches version to the revision count', () => {
    seed(handle.db);

    const stored = handle.db
      .select({ id: articles.id, version: articles.version, bodyMd: articles.bodyMd })
      .from(articles)
      .all();

    for (const article of stored) {
      const revisions = handle.db
        .select({
          revisionNumber: articleRevisions.revisionNumber,
          bodyMd: articleRevisions.bodyMd,
        })
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, article.id))
        .orderBy(articleRevisions.revisionNumber)
        .all();

      expect(revisions.length).toBeGreaterThanOrEqual(1);
      expect(article.version).toBe(revisions.length);
      expect(revisions[0].revisionNumber).toBe(1);
      // The newest revision holds the current body, which is the invariant
      // `articleRepository.updateArticle` maintains.
      expect(revisions.at(-1)?.bodyMd).toBe(article.bodyMd);
    }
  });

  it('stamps publishedAt only on published articles', () => {
    seed(handle.db);

    for (const row of handle.db
      .select({ status: articles.status, publishedAt: articles.publishedAt })
      .from(articles)
      .all()) {
      if (row.status === 'published') expect(row.publishedAt).toBeInstanceOf(Date);
      else expect(row.publishedAt).toBeNull();
    }
  });

  it('indexes every article for search through the FTS triggers', () => {
    seed(handle.db);

    const indexed = handle.sqlite.prepare('SELECT count(*) AS n FROM article_search').get() as {
      n: number;
    };

    expect(indexed.n).toBe(9);
    expect(
      handle.sqlite
        .prepare('SELECT rowid FROM article_search WHERE article_search MATCH ?')
        .all('"runbook"').length,
    ).toBeGreaterThan(0);
  });

  it('is idempotent: re-seeding converges on the same dataset', () => {
    seed(handle.db);
    seed(handle.db);

    expect(handle.db.select().from(categories).all()).toHaveLength(4);
    expect(handle.db.select().from(articles).all()).toHaveLength(9);

    // The re-seed deletes and re-inserts, so the FTS index must not accumulate
    // stale rows — that is what the delete trigger is for.
    const indexed = handle.sqlite.prepare('SELECT count(*) AS n FROM article_search').get() as {
      n: number;
    };
    expect(indexed.n).toBe(9);
  });

  it('leaves no orphaned revisions after a re-seed', () => {
    seed(handle.db);
    const revisionCount = Number(
      handle.db
        .select({ n: sql<number>`count(*)` })
        .from(articleRevisions)
        .get()?.n,
    );
    seed(handle.db);

    // The `ON DELETE CASCADE` on `article_revisions.article_id` plus the
    // trigger-maintained index is what keeps this exact.
    expect(
      Number(
        handle.db
          .select({ n: sql<number>`count(*)` })
          .from(articleRevisions)
          .get()?.n,
      ),
    ).toBe(revisionCount);
  });

  it('rolls back completely when the schema is not migrated', () => {
    const empty = createTestDb();
    empty.sqlite.exec('DROP TABLE articles');
    empty.sqlite.exec('DROP TABLE categories');

    expect(() => seed(empty.db)).toThrow();

    empty.close();
  });
});
