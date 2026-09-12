// Task 3.5 — the revision repository. The shape asserted here is what
// `design-spec.md` §3.4's `RevisionList` renders in iteration 6:
// `#12 · Jason · 2 days ago · "Clarified the rollback steps"`.
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '@/lib/result';
import { articleRevisions, articles } from '@/server/db/schema';
import { createTestDb } from '@/test/db';
import { resetFactoryCounters } from '@/test/factories';
import { createArticleRepository } from './articles';
import { DEFAULT_REVISION_LIMIT, createRevisionRepository } from './revisions';

type TestDb = ReturnType<typeof createTestDb>;

describe('revisionRepository', () => {
  let handle: TestDb;
  let repo: ReturnType<typeof createRevisionRepository>;
  let articleRepo: ReturnType<typeof createArticleRepository>;

  beforeEach(() => {
    resetFactoryCounters();
    handle = createTestDb();
    repo = createRevisionRepository(handle.db);
    articleRepo = createArticleRepository(handle.db);
  });

  afterEach(() => {
    handle.close();
  });

  function seed(title: string) {
    const created = articleRepo.createArticle({
      title,
      bodyMd: `## ${title}\n\nBody.`,
      status: 'published',
      editorName: 'Ada Lovelace',
    });
    if (!isOk(created)) throw new Error('fixture setup failed');
    return created.value;
  }

  function save(articleId: number, version: number, note: string, editorName = 'Grace Hopper') {
    const saved = articleRepo.updateArticle(articleId, {
      version,
      title: 'Whichever',
      bodyMd: `Body at version ${version + 1}`,
      status: 'published',
      editorName,
      changeNote: note,
    });
    if (!isOk(saved)) throw new Error(`save ${version} failed`);
    return saved.value;
  }

  describe('listForArticle', () => {
    it('returns the initial revision created by createArticle with revisionNumber 1', () => {
      const article = seed('Initial Revision');

      const revisions = repo.listForArticle(article.id);

      expect(revisions).toHaveLength(1);
      expect(revisions[0]).toMatchObject({
        revisionNumber: 1,
        editorName: 'Ada Lovelace',
        changeNote: 'Initial version',
        title: 'Initial Revision',
      });
      expect(revisions[0].createdAt).toBeInstanceOf(Date);
    });

    it('orders revisions newest first', () => {
      const article = seed('Ordered');
      save(article.id, 1, 'Second');
      save(article.id, 2, 'Third');

      const revisions = repo.listForArticle(article.id);

      expect(revisions.map((r) => r.revisionNumber)).toEqual([3, 2, 1]);
      expect(revisions.map((r) => r.changeNote)).toEqual(['Third', 'Second', 'Initial version']);
    });

    it('respects the limit and defaults to five', () => {
      const article = seed('Limited');
      for (let version = 1; version <= 7; version += 1)
        save(article.id, version, `Save ${version}`);

      const defaulted = repo.listForArticle(article.id);
      expect(defaulted).toHaveLength(DEFAULT_REVISION_LIMIT);
      // Newest five are revisions 8..4.
      expect(defaulted.map((r) => r.revisionNumber)).toEqual([8, 7, 6, 5, 4]);

      const two = repo.listForArticle(article.id, 2);
      expect(two.map((r) => r.revisionNumber)).toEqual([8, 7]);
    });

    it('returns [] for an article with no revisions', () => {
      // Insert an article row directly, bypassing the repository, so no
      // revision is written.
      const raw = handle.db
        .insert(articles)
        .values({
          title: 'No revisions',
          slug: 'no-revisions',
          bodyMd: 'Body.',
          status: 'draft',
          version: 1,
        })
        .returning({ id: articles.id })
        .get();

      expect(repo.listForArticle(raw.id)).toEqual([]);
    });

    it('returns [] for an article id that does not exist', () => {
      expect(repo.listForArticle(9999)).toEqual([]);
    });

    it('does not leak another article revisions', () => {
      const first = seed('First article');
      const second = seed('Second article');
      save(first.id, 1, 'Only on first');

      expect(repo.listForArticle(second.id)).toHaveLength(1);
      expect(repo.listForArticle(first.id)).toHaveLength(2);
    });

    it('returns the full snapshot fields RevisionList needs', () => {
      const article = seed('Snapshot');
      save(article.id, 1, 'Clarified the rollback steps');

      const [newest] = repo.listForArticle(article.id);

      expect(Object.keys(newest).sort()).toEqual([
        'bodyMd',
        'changeNote',
        'createdAt',
        'editorName',
        'id',
        'revisionNumber',
        'summary',
        'title',
      ]);
      expect(newest.bodyMd).toBe('Body at version 2');
    });

    it('keeps changeNote null when the save omitted one', () => {
      const article = seed('No note');
      const saved = articleRepo.updateArticle(article.id, {
        version: 1,
        title: 'No note',
        bodyMd: 'Body.',
        status: 'published',
        editorName: 'Ada Lovelace',
      });
      if (!isOk(saved)) throw new Error('save failed');

      expect(repo.listForArticle(article.id)[0].changeNote).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns a single revision', () => {
      const article = seed('By id');
      const [revision] = repo.listForArticle(article.id);

      const found = repo.getById(revision.id);

      if (!isOk(found)) throw new Error('expected the revision to be found');
      expect(found.value.revisionNumber).toBe(1);
      expect(found.value.createdAt).toBeInstanceOf(Date);
    });

    it('returns NOT_FOUND for an unknown id', () => {
      const missing = repo.getById(4242);

      expect(isErr(missing)).toBe(true);
      if (isErr(missing)) expect(missing.error.code).toBe('NOT_FOUND');
    });
  });

  describe('revision numbering invariant', () => {
    it('numbers every revision after createArticle as version + 1', () => {
      const article = seed('Invariant');
      save(article.id, 1, 'Second');
      save(article.id, 2, 'Third');

      const stored = handle.db
        .select({
          revisionNumber: articleRevisions.revisionNumber,
          bodyMd: articleRevisions.bodyMd,
        })
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, article.id))
        .all();

      // Revision #N is the state as of version N, and the newest revision holds
      // the article's current body — the model `src/server/db/seed.ts` encodes.
      expect(stored.map((r) => r.revisionNumber)).toEqual([1, 2, 3]);
      const current = handle.db.select().from(articles).where(eq(articles.id, article.id)).get();
      expect(stored.at(-1)?.bodyMd).toBe(current?.bodyMd);
      expect(current?.version).toBe(3);
    });
  });

  describe('cascade', () => {
    it('removes revisions when the article is deleted', () => {
      const article = seed('Cascades');
      save(article.id, 1, 'Second');

      handle.db.delete(articles).where(eq(articles.id, article.id)).run();

      expect(repo.listForArticle(article.id)).toEqual([]);
    });
  });
});
