// Task 3.2 — the category repository against a real migrated SQLite database.
// Matches the required cases in `docs/iterations/iteration-3.md` §3.2.
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { isErr, isOk } from '@/lib/result';
import { articles } from '@/server/db/schema';
import { createTestDb } from '@/test/db';
import { makeArticle, resetFactoryCounters } from '@/test/factories';
import { createCategoryRepository } from './categories';

type TestDb = ReturnType<typeof createTestDb>;

describe('categoryRepository', () => {
  let handle: TestDb;
  let repo: ReturnType<typeof createCategoryRepository>;

  beforeEach(() => {
    resetFactoryCounters();
    handle = createTestDb();
    repo = createCategoryRepository(handle.db);
  });

  afterEach(() => {
    handle.close();
  });

  describe('listWithCounts', () => {
    it('counts published articles and excludes drafts from the count', () => {
      const category = repo.create({ name: 'Engineering' });
      if (!isOk(category)) throw new Error('fixture setup failed');

      handle.db
        .insert(articles)
        .values([
          makeArticle({ categoryId: category.value.id, status: 'published' }),
          makeArticle({ categoryId: category.value.id, status: 'published' }),
          makeArticle({ categoryId: category.value.id, status: 'draft' }),
          makeArticle({ categoryId: category.value.id, status: 'archived' }),
        ])
        .run();

      const [row] = repo.listWithCounts();
      expect(row.articleCount).toBe(2);
    });

    it('returns articleCount: 0 for a category with no articles', () => {
      repo.create({ name: 'Empty' });

      expect(repo.listWithCounts()).toEqual([
        expect.objectContaining({ name: 'Empty', articleCount: 0 }),
      ]);
    });

    it('orders case-insensitively by name', () => {
      for (const name of ['beta', 'Alpha', 'Gamma']) repo.create({ name });

      expect(repo.listWithCounts().map((c) => c.name)).toEqual(['Alpha', 'beta', 'Gamma']);
    });

    it('counts articles per category in one query (no N+1)', () => {
      const first = repo.create({ name: 'First' });
      const second = repo.create({ name: 'Second' });
      if (!isOk(first) || !isOk(second)) throw new Error('fixture setup failed');

      handle.db
        .insert(articles)
        .values([
          makeArticle({ categoryId: first.value.id }),
          makeArticle({ categoryId: second.value.id }),
          makeArticle({ categoryId: second.value.id }),
          makeArticle({ categoryId: null }),
        ])
        .run();

      const statements: string[] = [];
      const original = handle.sqlite.prepare.bind(handle.sqlite);
      handle.sqlite.prepare = ((sql: string) => {
        statements.push(sql);
        return original(sql);
      }) as typeof handle.sqlite.prepare;

      const counts = repo.listWithCounts();
      handle.sqlite.prepare = original;

      expect(statements).toHaveLength(1);
      expect(counts).toEqual([
        expect.objectContaining({ name: 'First', articleCount: 1 }),
        expect.objectContaining({ name: 'Second', articleCount: 2 }),
      ]);
    });
  });

  describe('create', () => {
    it('rejects a case-insensitive duplicate name with CONFLICT', () => {
      expect(isOk(repo.create({ name: 'Engineering' }))).toBe(true);

      const duplicate = repo.create({ name: 'engineering' });

      expect(isErr(duplicate)).toBe(true);
      if (isErr(duplicate)) expect(duplicate.error.code).toBe('CONFLICT');
    });

    it('rejects a duplicate name even when the expression index is dropped', () => {
      expect(isOk(repo.create({ name: 'Engineering' }))).toBe(true);
      handle.sqlite.exec('DROP INDEX categories_name_nocase_unique');

      const duplicate = repo.create({ name: 'ENGINEERING' });

      expect(isErr(duplicate)).toBe(true);
      if (isErr(duplicate)) expect(duplicate.error.code).toBe('CONFLICT');
    });

    it('produces distinct slugs for distinct names', () => {
      const first = repo.create({ name: 'Engineering' });
      const second = repo.create({ name: 'Product' });

      if (!isOk(first) || !isOk(second)) throw new Error('create failed');
      expect(first.value.slug).toBe('engineering');
      expect(second.value.slug).toBe('product');
    });

    it('derives a unique slug when two names slugify identically', () => {
      const first = repo.create({ name: 'Design Docs' });
      const second = repo.create({ name: 'design docs!' });

      if (!isOk(first)) throw new Error('create failed');
      expect(first.value.slug).toBe('design-docs');
      // `design docs!` is a distinct name (the trailing `!` differs), so it is
      // accepted but must not collide on the slug.
      if (isOk(second)) expect(second.value.slug).toBe('design-docs-2');
    });

    it('restores a previously-failed insert as a usable database', () => {
      repo.create({ name: 'Engineering' });
      repo.create({ name: 'engineering' });

      const created = repo.create({ name: 'Operations' });
      expect(isOk(created)).toBe(true);
      expect(repo.listWithCounts().map((c) => c.name)).toEqual(['Engineering', 'Operations']);
    });

    it('falls back to a usable slug when the name slugifies to nothing', () => {
      // `slugify('???')` is `''`, which is not a usable URL segment; the
      // repository substitutes its documented fallback base instead of storing
      // an empty slug.
      const created = repo.create({ name: '???' });

      if (!isOk(created)) throw new Error('create failed');
      expect(created.value.slug).toBe('category');
    });

    it('suffixes the fallback slug when it is already taken', () => {
      repo.create({ name: '???' });

      const created = repo.create({ name: '!!!' });

      if (!isOk(created)) throw new Error('create failed');
      expect(created.value.slug).toBe('category-2');
    });

    it('returns the created row', () => {
      const created = repo.create({ name: 'People', description: 'Team practices' });

      if (!isOk(created)) throw new Error('create failed');
      expect(created.value).toEqual({
        id: expect.any(Number),
        name: 'People',
        slug: 'people',
        description: 'Team practices',
      });
    });
  });

  describe('getBySlug / getById', () => {
    it('finds a category by slug and by id', () => {
      const created = repo.create({ name: 'Engineering', description: 'How we build' });
      if (!isOk(created)) throw new Error('create failed');

      const bySlug = repo.getBySlug('engineering');
      const byId = repo.getById(created.value.id);

      expect(isOk(bySlug) && bySlug.value).toEqual(created.value);
      expect(isOk(byId) && byId.value).toEqual(created.value);
    });

    it('returns NOT_FOUND for an unknown slug', () => {
      const missing = repo.getBySlug('nope');

      expect(isErr(missing)).toBe(true);
      if (isErr(missing)) {
        expect(missing.error).toBeInstanceOf(AppError);
        expect(missing.error.code).toBe('NOT_FOUND');
      }
    });

    it('returns NOT_FOUND for an unknown id', () => {
      const missing = repo.getById(4242);

      expect(isErr(missing)).toBe(true);
      if (isErr(missing)) expect(missing.error.code).toBe('NOT_FOUND');
    });
  });

  describe('listOptions', () => {
    it('returns id/name/slug only, ordered by name', () => {
      repo.create({ name: 'zeta', description: 'ignored' });
      repo.create({ name: 'Alpha' });

      expect(repo.listOptions()).toEqual([
        { id: expect.any(Number), name: 'Alpha', slug: 'alpha' },
        { id: expect.any(Number), name: 'zeta', slug: 'zeta' },
      ]);
    });
  });

  describe('article counts after relationships change', () => {
    it('drops to zero when the only article is reassigned', () => {
      const engineering = repo.create({ name: 'Engineering' });
      const product = repo.create({ name: 'Product' });
      if (!isOk(engineering) || !isOk(product)) throw new Error('fixture setup failed');

      const inserted = handle.db
        .insert(articles)
        .values(makeArticle({ categoryId: engineering.value.id }))
        .returning({ id: articles.id })
        .get();

      handle.db
        .update(articles)
        .set({ categoryId: product.value.id })
        .where(eq(articles.id, inserted.id))
        .run();

      expect(repo.listWithCounts()).toEqual([
        expect.objectContaining({ name: 'Engineering', articleCount: 0 }),
        expect.objectContaining({ name: 'Product', articleCount: 1 }),
      ]);
    });
  });
});
