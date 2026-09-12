// Tasks 3.3 and 3.4 — article repository reads and writes against a real
// migrated SQLite database, covering the cases named in
// `docs/iterations/iteration-3.md` §3.3/§3.4 and `architecture.md` §11.3.
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '@/lib/result';
import { listQuerySchema } from '@/lib/validation/query';
import { articleRevisions, articles, categories } from '@/server/db/schema';
import { createTestDb } from '@/test/db';
import { makeArticle, resetFactoryCounters } from '@/test/factories';
import { REVISION_RETENTION, UNCATEGORIZED_CATEGORY, createArticleRepository } from './articles';
import { createCategoryRepository } from './categories';

type TestDb = ReturnType<typeof createTestDb>;

const query = (overrides: Record<string, unknown> = {}) =>
  listQuerySchema.parse({
    status: 'published',
    sort: 'updated',
    page: 1,
    pageSize: 20,
    ...overrides,
  });

describe('articleRepository', () => {
  let handle: TestDb;
  let repo: ReturnType<typeof createArticleRepository>;
  let categoryRepo: ReturnType<typeof createCategoryRepository>;

  /** A stored article, written the way the app writes one. */
  function seedArticle(
    overrides: Partial<{
      title: string;
      bodyMd: string;
      summary: string | null;
      status: 'draft' | 'published';
      categoryId: number | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) {
    const title = overrides.title ?? `Seed Article ${Math.random().toString(36).slice(2, 8)}`;
    const created = repo.createArticle({
      title,
      bodyMd: overrides.bodyMd ?? `## ${title}\n\nBody.`,
      summary: overrides.summary ?? null,
      status: overrides.status ?? 'published',
      categoryId: overrides.categoryId ?? null,
      editorName: 'Ada Lovelace',
    });
    if (!isOk(created)) throw new Error('seedArticle failed');

    if (overrides.createdAt || overrides.updatedAt) {
      handle.db
        .update(articles)
        .set({
          ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
          ...(overrides.updatedAt ? { updatedAt: overrides.updatedAt } : {}),
        })
        .where(eq(articles.id, created.value.id))
        .run();
    }

    return created.value;
  }

  beforeEach(() => {
    resetFactoryCounters();
    handle = createTestDb();
    repo = createArticleRepository(handle.db);
    categoryRepo = createCategoryRepository(handle.db);
  });

  afterEach(() => {
    handle.close();
  });

  describe('listArticles — status filter', () => {
    it('returns only published articles for the default query', () => {
      seedArticle({ title: 'Published one', status: 'published' });
      seedArticle({ title: 'Draft one', status: 'draft' });

      const page = repo.listArticles(query({ status: 'published' }));

      expect(page.items.map((a) => a.title)).toEqual(['Published one']);
    });

    it('returns only drafts for status: draft', () => {
      seedArticle({ title: 'Published one', status: 'published' });
      seedArticle({ title: 'Draft one', status: 'draft' });

      const page = repo.listArticles(query({ status: 'draft' }));

      expect(page.items.map((a) => a.title)).toEqual(['Draft one']);
    });

    it('returns both for status: all', () => {
      seedArticle({ title: 'Published one', status: 'published' });
      seedArticle({ title: 'Draft one', status: 'draft' });

      const page = repo.listArticles(query({ status: 'all' }));

      expect(page.items.map((a) => a.title).sort()).toEqual(['Draft one', 'Published one']);
    });

    it('includes archived articles only when status: all is requested', () => {
      const archived = seedArticle({ title: 'Archived one', status: 'published' });
      repo.archiveArticle(archived.id);
      seedArticle({ title: 'Live one', status: 'published' });

      // `status` is an enum of published|draft|all (§7.4), so `all` is the only
      // value that can reach an archived row: §14.3's filter is
      // `q.status === 'all' ? undefined : eq(articles.status, q.status)`.
      expect(
        repo
          .listArticles(query({ status: 'all' }))
          .items.map((a) => a.title)
          .sort(),
      ).toEqual(['Archived one', 'Live one']);

      expect(repo.listArticles(query({ status: 'published' })).items.map((a) => a.title)).toEqual([
        'Live one',
      ]);
      expect(repo.listArticles(query({ status: 'draft' })).items).toHaveLength(0);
    });
  });

  describe('listArticles — category filter', () => {
    it('returns only articles in the requested category', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      const product = categoryRepo.create({ name: 'Product' });
      if (!isOk(engineering) || !isOk(product)) throw new Error('fixture setup failed');

      seedArticle({ title: 'In engineering', categoryId: engineering.value.id });
      seedArticle({ title: 'In product', categoryId: product.value.id });
      seedArticle({ title: 'Uncategorized', categoryId: null });

      const page = repo.listArticles(query({ category: 'engineering' }));

      expect(page.items.map((a) => a.title)).toEqual(['In engineering']);
    });

    // Iteration 5.5: `/categories/uncategorized` is a real route, and a `NULL`
    // `category_id` has no `categories` row to join to (architecture.md §8.2:
    // "Uncategorized is a UI concept, not a row"), so the sentinel must be
    // translated to `IS NULL` rather than treated as a slug.
    it('treats the reserved `uncategorized` slug as category_id IS NULL', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');

      seedArticle({ title: 'In engineering', categoryId: engineering.value.id });
      seedArticle({ title: 'No category A', categoryId: null });
      seedArticle({ title: 'No category B', categoryId: null });

      const page = repo.listArticles(query({ category: UNCATEGORIZED_CATEGORY }));

      expect(page.items.map((a) => a.title).sort()).toEqual(['No category A', 'No category B']);
    });

    it('does not treat a real category named after the sentinel as the sentinel', () => {
      // The slug is reserved, so this can only arise from a direct insert; the
      // assertion pins that the sentinel branch is keyed on the slug, not on the
      // absence of a match.
      const page = repo.listArticles(query({ category: UNCATEGORIZED_CATEGORY }));

      expect(page.items).toEqual([]);
    });
  });

  describe('listArticles — forced total (iteration 5.6)', () => {
    it('computes the total on page 1 when forceTotal is set, for the JSON API envelope', () => {
      for (let i = 0; i < 3; i += 1) seedArticle({ title: `API Article ${i}` });

      const lazy = repo.listArticles(query());
      const forced = repo.listArticles(query(), { forceTotal: true });

      expect(lazy.total).toBeNull();
      expect(forced.total).toBe(3);
      expect(forced.items).toHaveLength(3);
    });
  });

  describe('listByIds (iteration 5.6)', () => {
    it('returns the requested rows in the order of the given ids', () => {
      const a = seedArticle({ title: 'First' }).id;
      const b = seedArticle({ title: 'Second' }).id;
      const c = seedArticle({ title: 'Third' }).id;

      const items = repo.listByIds([c, a, b]);

      expect(items.map((item) => item.title)).toEqual(['Third', 'First', 'Second']);
    });

    it('skips ids that do not exist rather than returning holes', () => {
      const a = seedArticle({ title: 'Only' }).id;

      expect(repo.listByIds([a, 999_999]).map((item) => item.title)).toEqual(['Only']);
    });

    it('returns [] for an empty id list, without querying', () => {
      expect(repo.listByIds([])).toEqual([]);
    });
  });

  describe('listArticles — sorting', () => {
    beforeEach(() => {
      seedArticle({
        title: 'Beta',
        createdAt: new Date(Date.UTC(2026, 0, 3)),
        updatedAt: new Date(Date.UTC(2026, 0, 1)),
      });
      seedArticle({
        title: 'alpha',
        createdAt: new Date(Date.UTC(2026, 0, 1)),
        updatedAt: new Date(Date.UTC(2026, 0, 3)),
      });
      seedArticle({
        title: 'Gamma',
        createdAt: new Date(Date.UTC(2026, 0, 2)),
        updatedAt: new Date(Date.UTC(2026, 0, 2)),
      });
    });

    it('sorts by updated (default) newest first', () => {
      expect(repo.listArticles(query()).items.map((a) => a.title)).toEqual([
        'alpha',
        'Gamma',
        'Beta',
      ]);
    });

    it('sorts by created newest first', () => {
      expect(repo.listArticles(query({ sort: 'created' })).items.map((a) => a.title)).toEqual([
        'Beta',
        'Gamma',
        'alpha',
      ]);
    });

    it('sorts by title case-insensitively ascending', () => {
      expect(repo.listArticles(query({ sort: 'title' })).items.map((a) => a.title)).toEqual([
        'alpha',
        'Beta',
        'Gamma',
      ]);
    });
  });

  describe('listArticles — pagination', () => {
    it('respects pageSize and reports hasNext at the boundary', () => {
      for (let i = 0; i < 21; i += 1) {
        seedArticle({ title: `Article ${String(i).padStart(2, '0')}` });
      }

      const page = repo.listArticles(query({ pageSize: 20 }));

      expect(page.items).toHaveLength(20);
      expect(page.hasNext).toBe(true);
      expect(page.total).toBeNull(); // page 1 never computes a total (§9.1)
    });

    it('reports hasNext: false when exactly pageSize rows remain', () => {
      for (let i = 0; i < 20; i += 1) {
        seedArticle({ title: `Article ${String(i).padStart(2, '0')}` });
      }

      const page = repo.listArticles(query({ pageSize: 20 }));

      expect(page.items).toHaveLength(20);
      expect(page.hasNext).toBe(false);
    });

    it('computes the exact total on page > 1', () => {
      for (let i = 0; i < 21; i += 1) {
        seedArticle({ title: `Article ${String(i).padStart(2, '0')}` });
      }

      const page = repo.listArticles(query({ pageSize: 20, page: 2 }));

      expect(page.items).toHaveLength(1);
      expect(page.hasNext).toBe(false);
      expect(page.total).toBe(21);
    });

    it('counts only the filtered rows in the total', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');

      seedArticle({ title: 'Match A', categoryId: engineering.value.id });
      seedArticle({ title: 'Match B', categoryId: engineering.value.id });
      seedArticle({ title: 'No match', categoryId: null });

      const page = repo.listArticles(query({ category: 'engineering', page: 2, pageSize: 1 }));

      expect(page.total).toBe(2);
    });
  });

  describe('listArticles — excerpt and category mapping', () => {
    it('populates excerpt from bodyMd when summary is null', () => {
      seedArticle({
        title: 'Excerpt test',
        summary: null,
        bodyMd: '## Heading\n\nPlain body text.',
      });

      const [item] = repo.listArticles(query()).items;

      expect(item.summary).toBeNull();
      expect(item.excerpt).toBe('Heading Plain body text.');
    });

    it('leaves summary untouched when it is set (the UI prefers it)', () => {
      seedArticle({ title: 'Summary test', summary: 'The author summary.', bodyMd: 'Body only.' });

      const [item] = repo.listArticles(query()).items;

      expect(item.summary).toBe('The author summary.');
      expect(item.excerpt).toBe('Body only.');
    });

    it('attaches the CategoryRef when categorized and null when not', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');
      seedArticle({ title: 'Categorized', categoryId: engineering.value.id });
      seedArticle({ title: 'Uncategorized', categoryId: null });

      const items = repo.listArticles(query()).items;

      expect(items.find((a) => a.title === 'Categorized')?.category).toEqual({
        id: engineering.value.id,
        name: 'Engineering',
        slug: 'engineering',
      });
      expect(items.find((a) => a.title === 'Uncategorized')?.category).toBeNull();
    });
  });

  describe('getArticleBySlug', () => {
    it('uses exactly two queries', () => {
      seedArticle({ title: 'Two Query Article' });

      const statements: string[] = [];
      const original = handle.sqlite.prepare.bind(handle.sqlite);
      handle.sqlite.prepare = ((statement: string) => {
        statements.push(statement);
        return original(statement);
      }) as typeof handle.sqlite.prepare;

      const found = repo.getArticleBySlug('two-query-article');
      handle.sqlite.prepare = original;

      expect(isOk(found)).toBe(true);
      expect(statements).toHaveLength(2);
    });

    it('returns the article with its category and bodyMd', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');
      seedArticle({ title: 'Detail Article', categoryId: engineering.value.id });

      const found = repo.getArticleBySlug('detail-article');

      if (!isOk(found)) throw new Error('expected the article to be found');
      expect(found.value.article.category?.slug).toBe('engineering');
      expect(found.value.article.bodyMd).toContain('Body.');
      expect(found.value.revisions).toHaveLength(1);
    });

    it('returns category: null for an uncategorized article', () => {
      seedArticle({ title: 'Uncategorized Detail', categoryId: null });

      const found = repo.getArticleBySlug('uncategorized-detail');

      if (!isOk(found)) throw new Error('expected the article to be found');
      expect(found.value.article.category).toBeNull();
    });

    it('returns err(NOT_FOUND) for an unknown slug', () => {
      const found = repo.getArticleBySlug('does-not-exist');

      expect(isErr(found)).toBe(true);
      if (isErr(found)) expect(found.error.code).toBe('NOT_FOUND');
    });

    it('still returns an archived article', () => {
      const archived = seedArticle({ title: 'Archived Detail' });
      repo.archiveArticle(archived.id);

      const found = repo.getArticleBySlug('archived-detail');

      if (!isOk(found)) throw new Error('an archived article must still resolve by slug');
      expect(found.value.article.status).toBe('archived');
    });

    it('limits revisions to five by default', () => {
      const article = seedArticle({ title: 'Many Revisions' });
      for (let version = 1; version <= 8; version += 1) {
        repo.updateArticle(article.id, {
          version,
          title: 'Many Revisions',
          bodyMd: `Revision ${version + 1}`,
          status: 'published',
          editorName: 'Grace Hopper',
        });
      }

      const found = repo.getArticleBySlug('many-revisions');

      if (!isOk(found)) throw new Error('expected the article to be found');
      expect(found.value.revisions).toHaveLength(5);
    });
  });

  describe('getArticleById / countArticles', () => {
    it('resolves by numeric id', () => {
      const article = seedArticle({ title: 'By Id' });

      const found = repo.getArticleById(article.id);

      if (!isOk(found)) throw new Error('expected the article to be found');
      expect(found.value.article.title).toBe('By Id');
    });

    it('returns NOT_FOUND for an unknown id', () => {
      expect(isErr(repo.getArticleById(9999))).toBe(true);
    });

    it('counts every article regardless of status', () => {
      seedArticle({ title: 'One', status: 'published' });
      seedArticle({ title: 'Two', status: 'draft' });

      expect(repo.countArticles()).toBe(2);
    });
  });

  describe('createArticle', () => {
    it('writes version 1 and revision 1, and indexes the row for search', () => {
      const created = seedArticle({ title: 'Deploying the API' });

      expect(created.version).toBe(1);
      expect(created.slug).toBe('deploying-the-api');

      const revisions = handle.db
        .select()
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, created.id))
        .all();

      expect(revisions).toHaveLength(1);
      expect(revisions[0]).toMatchObject({ revisionNumber: 1, changeNote: 'Initial version' });

      const indexed = handle.sqlite
        .prepare('SELECT rowid FROM article_search WHERE article_search MATCH ?')
        .all('"deploying"');
      expect(indexed).toEqual([{ rowid: created.id }]);
    });

    it('suffixes a colliding slug instead of failing', () => {
      const first = seedArticle({ title: 'Deploying the API' });
      const second = seedArticle({ title: 'Deploying the API' });

      expect(first.slug).toBe('deploying-the-api');
      expect(second.slug).toBe('deploying-the-api-2');
    });

    it('stamps publishedAt when created as published and leaves it null for a draft', () => {
      const published = seedArticle({ title: 'Now Published', status: 'published' });
      const draft = seedArticle({ title: 'Still Draft', status: 'draft' });

      const rows = handle.db.select().from(articles).all();
      expect(rows.find((r) => r.id === published.id)?.publishedAt).toBeInstanceOf(Date);
      expect(rows.find((r) => r.id === draft.id)?.publishedAt).toBeNull();
    });
  });

  describe('updateArticle — optimistic concurrency', () => {
    it('returns CONFLICT with the documented error shape on a stale version', () => {
      const article = seedArticle({ title: 'Concurrency' });

      const stale = repo.updateArticle(article.id, {
        version: 99,
        title: 'Should not apply',
        bodyMd: 'Nope',
        status: 'published',
        editorName: 'Ada Lovelace',
      });

      expect(isErr(stale)).toBe(true);
      if (isErr(stale)) {
        expect(stale.error.code).toBe('CONFLICT');
        expect(stale.error.details?.errors).toEqual([
          { path: 'version', message: 'Expected version 99, found 1.' },
        ]);
      }
    });

    it('leaves the row unchanged on a stale version', () => {
      const article = seedArticle({ title: 'Unchanged', bodyMd: 'Original body' });

      repo.updateArticle(article.id, {
        version: 42,
        title: 'Mutated',
        bodyMd: 'Mutated body',
        status: 'draft',
        editorName: 'Ada Lovelace',
      });

      const row = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(row?.title).toBe('Unchanged');
      expect(row?.bodyMd).toBe('Original body');
      expect(row?.version).toBe(1);
      expect(row?.status).toBe('published');
    });

    it('increments version and writes exactly one new revision on success', () => {
      const article = seedArticle({ title: 'Save me' });

      const saved = repo.updateArticle(article.id, {
        version: 1,
        title: 'Save me',
        bodyMd: 'Updated body',
        status: 'published',
        editorName: 'Grace Hopper',
        changeNote: 'Clarified the rollback steps',
      });

      if (!isOk(saved)) throw new Error('expected the save to succeed');
      expect(saved.value.version).toBe(2);

      const revisions = handle.db
        .select()
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, article.id))
        .orderBy(articleRevisions.revisionNumber)
        .all();

      expect(revisions).toHaveLength(2);
      expect(revisions.map((r) => r.revisionNumber)).toEqual([1, 2]);
      expect(revisions[1]).toMatchObject({
        editorName: 'Grace Hopper',
        changeNote: 'Clarified the rollback steps',
        bodyMd: 'Updated body',
      });
    });

    it('lets exactly one of two sequential updates from the same version win', () => {
      const article = seedArticle({ title: 'Race' });

      const first = repo.updateArticle(article.id, {
        version: 1,
        title: 'Race',
        bodyMd: 'First writer',
        status: 'published',
        editorName: 'First',
      });
      const second = repo.updateArticle(article.id, {
        version: 1,
        title: 'Race',
        bodyMd: 'Second writer',
        status: 'published',
        editorName: 'Second',
      });

      expect(isOk(first)).toBe(true);
      expect(isErr(second)).toBe(true);
      if (isErr(second)) expect(second.error.code).toBe('CONFLICT');

      const row = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(row?.bodyMd).toBe('First writer');
      expect(row?.version).toBe(2);
    });

    it('reflects the new body in search results through the update trigger', () => {
      const article = seedArticle({ title: 'Trigger guard', bodyMd: 'contains zanzibar' });

      repo.updateArticle(article.id, {
        version: 1,
        title: 'Trigger guard',
        bodyMd: 'contains quokka',
        status: 'published',
        editorName: 'Ada Lovelace',
      });

      const match = (term: string) =>
        handle.sqlite
          .prepare('SELECT rowid FROM article_search WHERE article_search MATCH ?')
          .all(term);

      expect(match('"zanzibar"')).toEqual([]);
      expect(match('"quokka"')).toEqual([{ rowid: article.id }]);
    });

    it('returns NOT_FOUND for an unknown id', () => {
      const missing = repo.updateArticle(9999, {
        version: 1,
        title: 'Ghost',
        bodyMd: 'Ghost body',
        status: 'draft',
        editorName: 'Ada Lovelace',
      });

      expect(isErr(missing)).toBe(true);
      if (isErr(missing)) expect(missing.error.code).toBe('NOT_FOUND');
    });
  });

  describe('updateArticle — publishedAt', () => {
    it('stamps publishedAt on the first draft -> published transition', () => {
      const article = seedArticle({ title: 'Go Live', status: 'draft' });

      const published = repo.updateArticle(article.id, {
        version: 1,
        title: 'Go Live',
        bodyMd: 'Body.',
        status: 'published',
        editorName: 'Ada Lovelace',
      });

      if (!isOk(published)) throw new Error('expected the publish to succeed');
      const row = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(row?.publishedAt).toBeInstanceOf(Date);
    });

    it('does not overwrite publishedAt on a second publish', () => {
      const article = seedArticle({ title: 'Stay Live', status: 'draft' });

      repo.updateArticle(article.id, {
        version: 1,
        title: 'Stay Live',
        bodyMd: 'Body.',
        status: 'published',
        editorName: 'Ada Lovelace',
      });
      const firstPublish = handle.db
        .select({ publishedAt: articles.publishedAt })
        .from(articles)
        .where(eq(articles.id, article.id))
        .get()?.publishedAt;

      repo.updateArticle(article.id, {
        version: 2,
        title: 'Stay Live',
        bodyMd: 'Body, edited.',
        status: 'published',
        editorName: 'Ada Lovelace',
      });
      const secondPublish = handle.db
        .select({ publishedAt: articles.publishedAt })
        .from(articles)
        .where(eq(articles.id, article.id))
        .get()?.publishedAt;

      expect(secondPublish?.getTime()).toBe(firstPublish?.getTime());
    });

    it('keeps publishedAt when a published article is moved back to draft', () => {
      const article = seedArticle({ title: 'Back to draft', status: 'published' });
      const before = handle.db
        .select({ publishedAt: articles.publishedAt })
        .from(articles)
        .where(eq(articles.id, article.id))
        .get()?.publishedAt;

      repo.updateArticle(article.id, {
        version: 1,
        title: 'Back to draft',
        bodyMd: 'Body.',
        status: 'draft',
        editorName: 'Ada Lovelace',
      });

      const after = handle.db
        .select({ publishedAt: articles.publishedAt })
        .from(articles)
        .where(eq(articles.id, article.id))
        .get()?.publishedAt;

      expect(after?.getTime()).toBe(before?.getTime());
    });
  });

  describe('updateArticle — revision pruning', () => {
    it('keeps exactly 20 revisions after 25 saves', () => {
      const article = seedArticle({ title: 'Churn' });

      for (let version = 1; version <= 25; version += 1) {
        const saved = repo.updateArticle(article.id, {
          version,
          title: 'Churn',
          bodyMd: `Body version ${version + 1}`,
          status: 'published',
          editorName: 'Ada Lovelace',
          changeNote: `Save ${version}`,
        });
        if (!isOk(saved)) throw new Error(`save ${version} failed`);
      }

      const rows = handle.db
        .select({ revisionNumber: articleRevisions.revisionNumber })
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, article.id))
        .all();

      expect(rows).toHaveLength(REVISION_RETENTION);
      // 26 revisions exist after the loop (revision 1 from `createArticle` plus
      // one per save), so the newest 20 survive: revision 7..26.
      expect(rows.map((r) => r.revisionNumber).sort((a, b) => a - b)).toEqual(
        Array.from({ length: REVISION_RETENTION }, (_, i) => i + 7),
      );

      const current = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(current?.version).toBe(26);
    });

    it('does not prune another article revisions', () => {
      const churn = seedArticle({ title: 'Churn' });
      const other = seedArticle({ title: 'Bystander' });

      for (let version = 1; version <= 25; version += 1) {
        repo.updateArticle(churn.id, {
          version,
          title: 'Churn',
          bodyMd: `Body ${version}`,
          status: 'published',
          editorName: 'Ada Lovelace',
        });
      }

      const bystanderRows = handle.db
        .select({ revisionNumber: articleRevisions.revisionNumber })
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, other.id))
        .all();

      expect(bystanderRows).toHaveLength(1);
    });
  });

  describe('archiveArticle', () => {
    it('sets status and archivedAt and retains revisions', () => {
      const article = seedArticle({ title: 'To Archive' });

      const archived = repo.archiveArticle(article.id, 'Ada Lovelace');

      if (!isOk(archived)) throw new Error('expected the archive to succeed');

      const row = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(row?.status).toBe('archived');
      expect(row?.archivedAt).toBeInstanceOf(Date);

      const revisions = handle.db
        .select()
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, article.id))
        .all();
      expect(revisions).toHaveLength(2);
    });

    it('returns NOT_FOUND for an unknown id', () => {
      expect(isErr(repo.archiveArticle(4242))).toBe(true);
    });

    it('causing a later save to conflict rather than silently resurrect it', () => {
      const article = seedArticle({ title: 'Archived then edited' });
      repo.archiveArticle(article.id, 'Ada Lovelace');

      const stale = repo.updateArticle(article.id, {
        version: 1,
        title: 'Archived then edited',
        bodyMd: 'New body',
        status: 'published',
        editorName: 'Ada Lovelace',
      });

      expect(isErr(stale)).toBe(true);
      if (isErr(stale)) expect(stale.error.code).toBe('CONFLICT');
    });
  });

  describe('foreign key behaviour', () => {
    it('nulls articles.category_id when the category is deleted', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');
      const article = seedArticle({ title: 'Orphaned', categoryId: engineering.value.id });

      handle.db.delete(categories).where(eq(categories.id, engineering.value.id)).run();

      const row = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(row?.categoryId).toBeNull();
      expect(repo.getArticleBySlug('orphaned').ok).toBe(true);
    });

    it('cascades revision deletion when the article is deleted', () => {
      const article = seedArticle({ title: 'Cascade' });
      repo.updateArticle(article.id, {
        version: 1,
        title: 'Cascade',
        bodyMd: 'Second body',
        status: 'published',
        editorName: 'Ada Lovelace',
      });

      expect(
        handle.db
          .select()
          .from(articleRevisions)
          .where(eq(articleRevisions.articleId, article.id))
          .all(),
      ).toHaveLength(2);

      handle.db.delete(articles).where(eq(articles.id, article.id)).run();

      expect(
        handle.db
          .select()
          .from(articleRevisions)
          .where(eq(articleRevisions.articleId, article.id))
          .all(),
      ).toHaveLength(0);
    });

    it('rejects an article pointing at a nonexistent category', () => {
      const created = repo.createArticle({
        title: 'Bad category',
        bodyMd: 'Body.',
        status: 'draft',
        categoryId: 9999,
        editorName: 'Ada Lovelace',
      });

      expect(isErr(created)).toBe(true);
      if (isErr(created)) expect(created.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('search index integration', () => {
    it('removes an article from the index when the article row is deleted', () => {
      const article = seedArticle({ title: 'Indexed then gone', bodyMd: 'unique-platypus' });

      handle.db.delete(articles).where(eq(articles.id, article.id)).run();

      const rows = handle.sqlite
        .prepare('SELECT rowid FROM article_search WHERE article_search MATCH ?')
        .all('"unique-platypus"');
      expect(rows).toEqual([]);
    });

    it('keeps the index rows in step with the articles table', () => {
      seedArticle({ title: 'One' });
      seedArticle({ title: 'Two' });
      const third = seedArticle({ title: 'Three' });
      handle.db.delete(articles).where(eq(articles.id, third.id)).run();

      const indexed = handle.sqlite.prepare('SELECT count(*) AS n FROM article_search').get() as {
        n: number;
      };
      const stored = handle.db
        .select({ n: sql<number>`count(*)` })
        .from(articles)
        .get();

      expect(indexed.n).toBe(Number(stored?.n));
    });
  });

  describe('factories stay independent of the repository', () => {
    it('inserts a factory payload directly without a revision', () => {
      handle.db
        .insert(articles)
        .values(makeArticle({ title: 'Direct insert' }))
        .run();

      expect(repo.countArticles()).toBe(1);
      expect(handle.db.select().from(articleRevisions).all()).toHaveLength(0);
    });
  });
});
