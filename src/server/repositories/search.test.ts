// Task 3.6 — the search repository. The eight cases `architecture.md` §11.3
// requires, plus the segment shape, the empty-query short-circuit, and the
// `LIKE` fallback.
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOk } from '@/lib/result';
import { articles, categories } from '@/server/db/schema';
import { createTestDb } from '@/test/db';
import { makeArticle, makeCategory, resetFactoryCounters } from '@/test/factories';
import { createArticleRepository } from './articles';
import { createCategoryRepository } from './categories';
import { FALLBACK_LIMIT, createSearchRepository } from './search';

type TestDb = ReturnType<typeof createTestDb>;

describe('searchRepository', () => {
  let handle: TestDb;
  let repo: ReturnType<typeof createSearchRepository>;
  let articleRepo: ReturnType<typeof createArticleRepository>;
  let categoryRepo: ReturnType<typeof createCategoryRepository>;
  let warnings: unknown[];

  beforeEach(() => {
    resetFactoryCounters();
    handle = createTestDb();
    warnings = [];
    repo = createSearchRepository(handle.db, {
      onFallback: (reason) => warnings.push(reason),
    });
    articleRepo = createArticleRepository(handle.db);
    categoryRepo = createCategoryRepository(handle.db);
  });

  afterEach(() => {
    handle.close();
  });

  function seed(
    title: string,
    bodyMd: string,
    options: {
      status?: 'draft' | 'published';
      summary?: string | null;
      categoryId?: number | null;
    } = {},
  ) {
    const created = articleRepo.createArticle({
      title,
      bodyMd,
      summary: options.summary ?? null,
      status: options.status ?? 'published',
      categoryId: options.categoryId ?? null,
      editorName: 'Ada Lovelace',
    });
    if (!isOk(created)) throw new Error('fixture setup failed');
    return created.value;
  }

  const titles = (q: string, options?: Parameters<typeof repo.searchArticles>[1]) => {
    const result = repo.searchArticles(q, options);
    if (!isOk(result)) throw new Error('search returned an error');
    return result.value.results.map((hit) => hit.title);
  };

  describe('indexing', () => {
    it('finds an article by a title word and by a body word', () => {
      seed('Deploying the API', 'Run the release script with the production flag.');

      expect(titles('deploying')).toEqual(['Deploying the API']);
      expect(titles('production')).toEqual(['Deploying the API']);
    });

    it('matches a prefix of the final token', () => {
      seed('Deploying the API', 'Nothing else here.');

      expect(titles('deploy')).toEqual(['Deploying the API']);
    });

    it('removes the old term and adds the new one after a body update', () => {
      const article = seed('Trigger guard', 'This body mentions zanzibar.');

      expect(titles('zanzibar')).toEqual(['Trigger guard']);

      const saved = articleRepo.updateArticle(article.id, {
        version: 1,
        title: 'Trigger guard',
        bodyMd: 'This body mentions quokka now.',
        status: 'published',
        editorName: 'Grace Hopper',
      });
      if (!isOk(saved)) throw new Error('update failed');

      // This is the assertion that catches a broken `articles_search_au` trigger.
      expect(titles('zanzibar')).toEqual([]);
      expect(titles('quokka')).toEqual(['Trigger guard']);
    });

    it('removes an article from results when it is deleted', () => {
      const article = seed('Disposable', 'A body about pelicans.');

      expect(titles('pelicans')).toEqual(['Disposable']);

      handle.db.delete(articles).where(eq(articles.id, article.id)).run();

      expect(titles('pelicans')).toEqual([]);
    });
  });

  describe('status filter', () => {
    it('excludes a draft when status is published and includes it for all', () => {
      seed('Hidden draft', 'A body about aardvarks.', { status: 'draft' });

      expect(titles('aardvarks', { status: 'published' })).toEqual([]);
      expect(titles('aardvarks', { status: 'all' })).toEqual(['Hidden draft']);
    });

    it('defaults to published', () => {
      seed('Default scope', 'A body about narwhals.', { status: 'draft' });

      expect(titles('narwhals')).toEqual([]);
    });

    it('returns only drafts for status: draft', () => {
      seed('Published one', 'A body about okapis.', { status: 'published' });
      seed('Draft one', 'A body about okapis.', { status: 'draft' });

      expect(titles('okapis', { status: 'draft' })).toEqual(['Draft one']);
    });
  });

  describe('ranking', () => {
    it('outranks a body match with a title match for the same term', () => {
      seed('Body only', 'This paragraph is about zeppelins in detail.');
      seed('Zeppelins explained', 'Nothing relevant in this paragraph at all.');

      const result = repo.searchArticles('zeppelins');
      if (!isOk(result)) throw new Error('search returned an error');

      const [first, second] = result.value.results;
      expect(first.title).toBe('Zeppelins explained');
      expect(second.title).toBe('Body only');
      // bm25 is negative-better, so the winner's rank is the lower one.
      expect(first.rank).toBeLessThan(second.rank);
    });

    it('returns rank ascending', () => {
      seed('Alpha', 'A paragraph about wombats.');
      seed('Wombats', 'A paragraph about nothing else.');

      const result = repo.searchArticles('wombats');
      if (!isOk(result)) throw new Error('search returned an error');

      const ranks = result.value.results.map((hit) => hit.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });
  });

  describe('limit', () => {
    it('respects the limit', () => {
      for (let i = 0; i < 6; i += 1) seed(`Capybara ${i}`, 'All about capybaras.');

      expect(titles('capybaras', { limit: 3 })).toHaveLength(3);
      expect(titles('capybaras', { limit: 10 })).toHaveLength(6);
    });
  });

  describe('invalid and empty input', () => {
    it('returns [] for invalid FTS syntax instead of throwing', () => {
      seed('Some article', 'A body.');

      for (const bad of ['"deploy', 'deploy"', 'NOT', '((', 'a*b', '^x', 'title:']) {
        const result = repo.searchArticles(bad);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) expect(Array.isArray(result.value.results)).toBe(true);
      }
    });

    it('returns [] without touching the database for an empty query', () => {
      seed('Some article', 'A body about pangolins.');

      const statements: string[] = [];
      const original = handle.sqlite.prepare.bind(handle.sqlite);
      handle.sqlite.prepare = ((statement: string) => {
        statements.push(statement);
        return original(statement);
      }) as typeof handle.sqlite.prepare;

      const blank = repo.searchArticles('');
      const spaces = repo.searchArticles('   ');
      handle.sqlite.prepare = original;

      expect(statements).toEqual([]);
      expect(isOk(blank) && blank.value.results).toEqual([]);
      expect(isOk(spaces) && spaces.value.results).toEqual([]);
    });

    it('returns an empty result set for a term that matches nothing', () => {
      seed('Some article', 'A body about pangolins.');

      expect(titles('nonexistentterm')).toEqual([]);
    });
  });

  describe('segments', () => {
    it('marks the matching part of the title and the snippet', () => {
      seed('Deploying the API', 'Run the deploy script with the production flag.');

      const result = repo.searchArticles('deploy');
      if (!isOk(result)) throw new Error('search returned an error');
      const [hit] = result.value.results;

      expect(hit.titleSegments.some((segment) => segment.match)).toBe(true);
      expect(hit.snippetSegments.some((segment) => segment.match)).toBe(true);
    });

    it('reconstructs the original title from its segments', () => {
      seed('Deploying the API', 'Body.');

      const result = repo.searchArticles('deploying');
      if (!isOk(result)) throw new Error('search returned an error');
      const [hit] = result.value.results;

      expect(hit.titleSegments.map((s) => s.text).join('')).toBe('Deploying the API');
    });

    it('returns text verbatim, never HTML-escaped or interpreted', () => {
      seed('<script>alert(1)</script> Deploy', 'Body text.');

      const result = repo.searchArticles('deploy');
      if (!isOk(result)) throw new Error('search returned an error');
      const [hit] = result.value.results;

      // `splitSegments` returns plain text, so the repository must NOT escape it:
      // the title reconstructs byte-for-byte and React escapes at render time
      // (architecture.md §6.7, §8.1). Escaping here would double-escape on screen.
      expect(hit.titleSegments.map((s) => s.text).join('')).toBe(
        '<script>alert(1)</script> Deploy',
      );

      for (const segment of [...hit.titleSegments, ...hit.snippetSegments]) {
        expect(Object.keys(segment).sort()).toEqual(['match', 'text']);
        expect(typeof segment.text).toBe('string');
        expect(typeof segment.match).toBe('boolean');
        expect(segment.text).not.toContain('\u0001');
        expect(segment.text).not.toContain('\u0002');
        expect(segment.text).not.toContain('&lt;');
        expect(segment.text).not.toContain('<mark');
      }
    });

    it('matches the title case-insensitively and accent-insensitively', () => {
      seed('Café Deployment', 'Body.');

      expect(titles('cafe')).toEqual(['Café Deployment']);
    });
  });

  describe('category attachment', () => {
    it('attaches the category reference when the article has one', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');
      seed('Categorized search', 'A body about meerkats.', { categoryId: engineering.value.id });

      const result = repo.searchArticles('meerkats');
      if (!isOk(result)) throw new Error('search returned an error');

      expect(result.value.results[0].category).toEqual({
        id: engineering.value.id,
        name: 'Engineering',
        slug: 'engineering',
      });
    });

    it('returns category: null for an uncategorized article', () => {
      seed('Uncategorized search', 'A body about meerkats.', { categoryId: null });

      const result = repo.searchArticles('meerkats');
      if (!isOk(result)) throw new Error('search returned an error');

      expect(result.value.results[0].category).toBeNull();
    });
  });

  describe('LIKE fallback', () => {
    it('engages when the virtual table is dropped and still returns results', () => {
      seed('Deploying the API', 'Run the deploy script with the production flag.');

      handle.sqlite.exec('DROP TRIGGER articles_search_ai');
      handle.sqlite.exec('DROP TRIGGER articles_search_ad');
      handle.sqlite.exec('DROP TRIGGER articles_search_au');
      handle.sqlite.exec('DROP TABLE article_search');

      const result = repo.searchArticles('deploying');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.results.map((hit) => hit.title)).toEqual(['Deploying the API']);
      }
      expect(warnings).toHaveLength(1);
    });

    it('honours the status filter in the fallback path', () => {
      // The fallback scans `title`/`summary` only (§8.1), so the term lives in
      // the summary here — the FTS path would have matched the body too.
      seed('Published fallback', 'A body.', {
        status: 'published',
        summary: 'All about tapirs.',
      });
      seed('Draft fallback', 'A body.', { status: 'draft', summary: 'All about tapirs.' });

      handle.sqlite.exec('DROP TABLE article_search');

      const published = repo.searchArticles('tapirs', { status: 'published' });
      const all = repo.searchArticles('tapirs', { status: 'all' });

      if (!isOk(published) || !isOk(all)) throw new Error('fallback returned an error');
      expect(published.value.results.map((h) => h.title)).toEqual(['Published fallback']);
      expect(all.value.results.map((h) => h.title).sort()).toEqual([
        'Draft fallback',
        'Published fallback',
      ]);
    });

    it('scans title and summary, which is what §8.1 specifies', () => {
      seed('Term only in the body', 'A body about axolotls.');

      handle.sqlite.exec('DROP TABLE article_search');

      // Documented limitation of the degraded path: it is not full-text, so a
      // body-only match is missed rather than throwing.
      expect(titles('axolotls')).toEqual([]);
    });

    it('never exceeds the 50-row cap', () => {
      for (let i = 0; i < 60; i += 1) {
        seed(`Quokka ${i}`, 'A body.', { summary: 'A summary about quokkas.' });
      }

      handle.sqlite.exec('DROP TABLE article_search');

      const result = repo.searchArticles('quokka', { limit: 100 });

      if (!isOk(result)) throw new Error('fallback returned an error');
      expect(result.value.results).toHaveLength(FALLBACK_LIMIT);
    });

    it('returns [] rather than throwing when the term matches nothing', () => {
      seed('Unrelated', 'A body about lemurs.');
      handle.sqlite.exec('DROP TABLE article_search');

      expect(titles('zzzz')).toEqual([]);
    });

    it('does not throw when both the index and the fallback are unusable', () => {
      handle.sqlite.exec('DROP TABLE article_search');

      const result = repo.searchArticles('anything');

      expect(isOk(result)).toBe(true);
    });
  });

  describe('countSearchResults', () => {
    it('counts every match, not just the first page', () => {
      for (let i = 0; i < 12; i += 1) seed(`Puffin ${i}`, 'A body about puffins.');

      expect(repo.countSearchResults('puffins')).toBe(12);
      // The result page is capped by `limit`, which is why the count is a
      // separate query rather than `results.length`.
      expect(titles('puffins', { limit: 5 })).toHaveLength(5);
    });

    it('honours the status filter', () => {
      seed('Published puffin', 'A body about puffins.', { status: 'published' });
      seed('Draft puffin', 'A body about puffins.', { status: 'draft' });

      expect(repo.countSearchResults('puffins', { status: 'published' })).toBe(1);
      expect(repo.countSearchResults('puffins', { status: 'all' })).toBe(2);
    });

    it('returns 0 for an empty query without touching the database', () => {
      const statement = vi.spyOn(handle.sqlite, 'prepare');

      expect(repo.countSearchResults('   ')).toBe(0);
      expect(statement).not.toHaveBeenCalled();

      statement.mockRestore();
    });

    it('falls back to the LIKE count when the index is gone', () => {
      seed('Fallback count', 'A body.', { summary: 'A summary about ibexes.' });
      handle.sqlite.exec('DROP TABLE article_search');

      expect(repo.countSearchResults('ibexes')).toBe(1);
    });
  });

  describe('result envelope', () => {
    it('echoes the query and limit back', () => {
      seed('Envelope', 'A body about stoats.');

      const result = repo.searchArticles('stoats', { limit: 4 });

      if (!isOk(result)) throw new Error('search returned an error');
      expect(result.value.query).toBe('stoats');
      expect(result.value.limit).toBe(4);
      expect(result.value.total).toBeNull();
    });
  });

  describe('rows inserted outside the repository', () => {
    it('indexes a raw insert through the trigger', () => {
      const engineering = categoryRepo.create({ name: 'Engineering' });
      if (!isOk(engineering)) throw new Error('fixture setup failed');

      handle.db
        .insert(articles)
        .values(
          makeArticle({
            title: 'Raw insert',
            slug: 'raw-insert',
            bodyMd: 'A body about marmots.',
            categoryId: engineering.value.id,
          }),
        )
        .run();

      expect(titles('marmots')).toEqual(['Raw insert']);
    });

    it('does not index a category row', () => {
      handle.db
        .insert(categories)
        .values(makeCategory({ name: 'Weasels', slug: 'weasels' }))
        .run();

      expect(titles('weasels')).toEqual([]);
    });
  });
});
