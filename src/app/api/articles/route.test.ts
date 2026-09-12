// Task 5.6's list-envelope and `[idOrSlug]` contract, asserted against a real
// migrated SQLite temp database through the real repositories.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '@/lib/result';
import { createArticleRepository } from '@/server/repositories/articles';
import { createTestDb } from '@/test/db';
import { GET as getArticle } from './[idOrSlug]/route';
import { GET as getArticles } from './route';

type TestDb = ReturnType<typeof createTestDb>;

describe('GET /api/articles', () => {
  let handle: TestDb;
  let departments: { published: number; draft: number };

  beforeEach(() => {
    handle = createTestDb();
    const articles = createArticleRepository(handle.db);

    const publish = (n: number, status: 'published' | 'draft') => {
      const result = articles.createArticle({
        title: `Article number ${n}`,
        bodyMd: `## Body ${n}\n\nContent for article ${n}.`,
        summary: `Summary ${n}.`,
        status,
        editorName: 'Ada Lovelace',
      });
      if (!isOk(result)) throw new Error('fixture failed');
      return result.value.id;
    };

    const publishedIds = [1, 2, 3].map((n) => publish(n, 'published'));
    const draftIds = [4, 5].map((n) => publish(n, 'draft'));
    departments = { published: publishedIds.length, draft: draftIds.length };
  });

  afterEach(() => {
    handle.close();
  });

  it('returns the documented envelope with a numeric pageSize ≤ 50', async () => {
    const response = await getArticles(new Request('http://localhost/api/articles?pageSize=25'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body).toMatchObject({ page: 1, pageSize: 25 });
    expect(typeof body.total).toBe('number');
    expect(typeof body.totalPages).toBe('number');
    expect(body.pageSize).toBeLessThanOrEqual(50);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('carries every documented item member', async () => {
    const body = await (await getArticles(new Request('http://localhost/api/articles'))).json();
    const item = body.items[0];

    expect(Object.keys(item).sort()).toEqual(
      [
        'category',
        'createdAt',
        'excerpt',
        'id',
        'publishedAt',
        'slug',
        'status',
        'summary',
        'title',
        'updatedAt',
        'version',
      ].sort(),
    );
  });

  it('returns only published items by default', async () => {
    const body = await (await getArticles(new Request('http://localhost/api/articles'))).json();

    expect(body.items).toHaveLength(departments.published);
    expect(body.total).toBe(departments.published);
    expect(body.items.every((item: { status: string }) => item.status === 'published')).toBe(true);
  });

  it('clamps pageSize=999 rather than erroring', async () => {
    const response = await getArticles(new Request('http://localhost/api/articles?pageSize=999'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pageSize).toBe(50);
  });

  it('paginates with a consistent total and totalPages', async () => {
    const body = await (
      await getArticles(new Request('http://localhost/api/articles?pageSize=2&page=2'))
    ).json();

    expect(body.page).toBe(2);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(3);
    expect(body.totalPages).toBe(2);
  });

  it('delegates to search when q is present and still answers the list envelope', async () => {
    const body = await (
      await getArticles(new Request('http://localhost/api/articles?q=number'))
    ).json();

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.total).toBe(departments.published);
    // The list item shape, not the search hit shape.
    expect(body.items[0]).toHaveProperty('version');
    expect(body.items[0]).not.toHaveProperty('rank');
  });

  it('never 500s on a malformed q', async () => {
    const response = await getArticles(new Request('http://localhost/api/articles?q=%22+AND'));

    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual([]);
  });
});

describe('GET /api/articles/:idOrSlug', () => {
  let handle: TestDb;
  let slug: string;
  let id: number;

  beforeEach(() => {
    handle = createTestDb();
    const articles = createArticleRepository(handle.db);
    const created = articles.createArticle({
      title: 'Deploying the API',
      bodyMd: '## Prerequisites\n\nNode 24 LTS.',
      summary: 'A deploy guide.',
      status: 'published',
      editorName: 'Ada Lovelace',
    });
    if (!isOk(created)) throw new Error('fixture failed');
    slug = created.value.slug;
    id = created.value.id;
  });

  afterEach(() => {
    handle.close();
  });

  function context(idOrSlug: string) {
    return { params: Promise.resolve({ idOrSlug }) };
  }

  it('resolves by slug and includes bodyMd and category', async () => {
    const response = await getArticle(
      new Request(`http://localhost/api/articles/${slug}`),
      context(slug),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slug).toBe(slug);
    expect(body.bodyMd).toContain('Node 24 LTS');
    expect(body).toHaveProperty('category');
  });

  it('accepts a numeric id', async () => {
    const response = await getArticle(
      new Request(`http://localhost/api/articles/${id}`),
      context(String(id)),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(id);
    expect(body.slug).toBe(slug);
  });

  it('returns 404 with type .../not-found for an unknown slug', async () => {
    const response = await getArticle(
      new Request('http://localhost/api/articles/unknown-slug'),
      context('unknown-slug'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body.type).toBe('https://kb.local/problems/not-found');
  });

  it('returns 404 for an unknown numeric id', async () => {
    const response = await getArticle(
      new Request('http://localhost/api/articles/999999'),
      context('999999'),
    );

    expect(response.status).toBe(404);
  });
});
