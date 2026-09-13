import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The write half of `src/app/api/articles` (iteration 6.8): `POST`, `PATCH`, `DELETE`.
 *
 * Every assertion is against a real migrated SQLite temp database through the real
 * repositories, so "DELETE archives rather than deletes" is proven by reading the row
 * back rather than by asserting on a mock's arguments.
 *
 * `next/headers` is stubbed because a route handler has no request-scoped cookie jar in
 * a unit test; `next/cache` is not needed here (route handlers use it only for
 * `revalidatePath`, which these handlers do not call).
 */

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock('@/server/logger', () => ({ logger: { info: () => undefined } }));

const { POST } = await import('./route');
const { PATCH, DELETE } = await import('./[idOrSlug]/route');
const { createArticleRepository } = await import('@/server/repositories/articles');
const { createRevisionRepository } = await import('@/server/repositories/revisions');
const { createTestDb } = await import('@/test/db');

type TestDb = ReturnType<typeof createTestDb>;

const BASE = 'http://localhost/api/articles';

/** A JSON mutation request, including the headers the routes require. */
function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  });
}

function context(idOrSlug: string) {
  return { params: Promise.resolve({ idOrSlug }) };
}

describe('/api/articles writes', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  function seedArticle(overrides: { status?: 'draft' | 'published' } = {}) {
    const result = createArticleRepository(handle.db).createArticle({
      title: 'Deploying the API',
      bodyMd: '## Prerequisites\n\nNode 24 LTS.',
      summary: 'A deploy guide.',
      status: overrides.status ?? 'published',
      editorName: 'Ada Lovelace',
    });
    if (!result.ok) throw new Error('fixture failed');
    return result.value;
  }

  describe('POST /api/articles', () => {
    it('creates the article and answers 201 with a Location header', async () => {
      const response = await POST(
        jsonRequest(BASE, 'POST', {
          title: 'Deploying the API',
          bodyMd: '## Prerequisites',
          status: 'draft',
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(response.headers.get('location')).toBe(`/api/articles/${body.id}`);
      expect(Object.keys(body).sort()).toEqual(
        ['createdAt', 'id', 'slug', 'status', 'version'].sort(),
      );
      expect(body).toMatchObject({ slug: 'deploying-the-api', version: 1, status: 'draft' });
    });

    it('returns 422 with the documented errors array for an invalid body', async () => {
      const response = await POST(jsonRequest(BASE, 'POST', { title: 'Hi', bodyMd: '' }));
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors).toEqual(
        expect.arrayContaining([
          { path: 'title', message: 'Title must be at least 3 characters.' },
          { path: 'bodyMd', message: 'Article body cannot be empty.' },
        ]),
      );
      expect(createArticleRepository(handle.db).countArticles()).toBe(0);
    });

    it('rejects a cross-origin request with 403', async () => {
      const request = new Request(BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://evil.example',
          host: 'localhost',
        },
        body: JSON.stringify({ title: 'Deploying the API', bodyMd: 'x' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      expect(createArticleRepository(handle.db).countArticles()).toBe(0);
    });

    it('rejects a form-encoded body with 415', async () => {
      const request = new Request(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'title=Deploying+the+API',
      });

      const response = await POST(request);

      expect(response.status).toBe(415);
    });
  });

  describe('PATCH /api/articles/:idOrSlug', () => {
    it('returns 409 with the expected/found error for a stale version', async () => {
      const created = seedArticle();

      const response = await PATCH(
        jsonRequest(`${BASE}/${created.slug}`, 'PATCH', {
          version: created.version + 4,
          title: 'Deploying the API (updated)',
          bodyMd: '## Prerequisites',
          status: 'published',
        }),
        context(created.slug),
      );
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(body.type).toBe('https://kb.local/problems/conflict');
      expect(body.errors).toEqual([
        {
          path: 'version',
          message: `Expected version ${created.version + 4}, found ${created.version}.`,
        },
      ]);

      // The row is unchanged.
      const after = createArticleRepository(handle.db).getArticleById(created.id);
      if (!after.ok) throw new Error('article vanished');
      expect(after.value.article.version).toBe(created.version);
    });

    it('saves with the correct version and returns id/slug/version/updatedAt', async () => {
      const created = seedArticle();

      const response = await PATCH(
        jsonRequest(`${BASE}/${created.slug}`, 'PATCH', {
          version: created.version,
          title: 'Deploying the API (updated)',
          bodyMd: '## Prerequisites\n\nUpdated.',
          status: 'published',
        }),
        context(created.slug),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(Object.keys(body).sort()).toEqual(['id', 'slug', 'updatedAt', 'version'].sort());
      expect(body.version).toBe(created.version + 1);
    });

    it('returns 404 for an unknown slug', async () => {
      const response = await PATCH(
        jsonRequest(`${BASE}/nope`, 'PATCH', {
          version: 1,
          title: 'Anything',
          bodyMd: 'x',
          status: 'draft',
        }),
        context('nope'),
      );

      expect(response.status).toBe(404);
      expect((await response.json()).type).toBe('https://kb.local/problems/not-found');
    });
  });

  describe('DELETE /api/articles/:idOrSlug', () => {
    it('returns 204 and archives rather than removing the row', async () => {
      const created = seedArticle();

      const response = await DELETE(
        new Request(`${BASE}/${created.slug}`, {
          method: 'DELETE',
          headers: { origin: 'http://localhost', host: 'localhost' },
        }),
        context(created.slug),
      );

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');

      const after = createArticleRepository(handle.db).getArticleById(created.id);
      if (!after.ok) throw new Error('the row was removed; DELETE must be soft');
      expect(after.value.article.status).toBe('archived');
      // Revisions are retained, which is the whole point of a soft archive.
      expect(
        createRevisionRepository(handle.db).listForArticle(created.id).length,
      ).toBeGreaterThanOrEqual(1);
      expect(createArticleRepository(handle.db).countArticles()).toBe(1);
    });

    it('accepts a numeric id as well as a slug', async () => {
      const created = seedArticle();

      const response = await DELETE(
        new Request(`${BASE}/${created.id}`, {
          method: 'DELETE',
          headers: { origin: 'http://localhost', host: 'localhost' },
        }),
        context(String(created.id)),
      );

      expect(response.status).toBe(204);
    });

    it('rejects a cross-origin request with 403 and leaves the row published', async () => {
      const created = seedArticle();

      const response = await DELETE(
        new Request(`${BASE}/${created.slug}`, {
          method: 'DELETE',
          headers: { origin: 'https://evil.example', host: 'localhost' },
        }),
        context(created.slug),
      );

      expect(response.status).toBe(403);
      const after = createArticleRepository(handle.db).getArticleById(created.id);
      if (!after.ok) throw new Error('article vanished');
      expect(after.value.article.status).toBe('published');
    });
  });
});
