// `GET /api/categories` (iteration 5.6). The published-only count is the assertion
// that matters: `design-spec.md` §4.4's sidebar counts and §4.5's "drafts must not
// dilute the default view" both depend on it.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '@/lib/result';
import { createArticleRepository } from '@/server/repositories/articles';
import { createCategoryRepository } from '@/server/repositories/categories';
import { createTestDb } from '@/test/db';
import { GET } from './route';

type TestDb = ReturnType<typeof createTestDb>;

describe('GET /api/categories', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  it('returns the documented item shape', async () => {
    createCategoryRepository(handle.db).create({
      name: 'Engineering',
      description: 'Build and ship.',
    });

    const response = GET(new Request('http://localhost/api/categories'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body.items).toHaveLength(1);
    expect(Object.keys(body.items[0]).sort()).toEqual(
      ['articleCount', 'description', 'id', 'name', 'slug'].sort(),
    );
  });

  it('counts only published articles', async () => {
    const categories = createCategoryRepository(handle.db);
    const articles = createArticleRepository(handle.db);

    const engineering = categories.create({ name: 'Engineering' });
    if (!isOk(engineering)) throw new Error('fixture failed');

    const publish = (title: string, status: 'published' | 'draft') => {
      const result = articles.createArticle({
        title,
        bodyMd: `## ${title}`,
        status,
        categoryId: engineering.value.id,
        editorName: 'Ada Lovelace',
      });
      if (!isOk(result)) throw new Error('fixture failed');
    };
    publish('One', 'published');
    publish('Two', 'published');
    publish('Draft one', 'draft');

    const body = await GET(new Request('http://localhost/api/categories')).json();

    expect(body.items[0].articleCount).toBe(2);
  });

  it('returns an empty items array when no categories exist', async () => {
    const body = await GET(new Request('http://localhost/api/categories')).json();

    expect(body.items).toEqual([]);
  });
});
