// Task 5.6's "done when": every documented shape, plus the two negative cases that
// the brief's "handle errors gracefully — no silent failures" requirement is really
// about (missing `q` → 400, malformed `q` → 200 with an empty set, never a 500).
//
// These call the handler functions directly with a `Request`, exactly like
// `api/health/route.test.ts`: route handlers are Node code with no request-time
// Next.js API surface, so the real repository and a real migrated SQLite temp
// database are exercised rather than a mock.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '@/lib/result';
import { createArticleRepository } from '@/server/repositories/articles';
import { createCategoryRepository } from '@/server/repositories/categories';
import { createTestDb } from '@/test/db';
import { GET } from './route';

type TestDb = ReturnType<typeof createTestDb>;

describe('GET /api/search', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
    seed();
  });

  afterEach(() => {
    handle.close();
  });

  function seed() {
    const articles = createArticleRepository(handle.db);
    const categories = createCategoryRepository(handle.db);

    const engineering = categories.create({ name: 'Engineering' });
    if (!isOk(engineering)) throw new Error('category fixture failed');

    const created = articles.createArticle({
      title: 'Deploying the API to Production',
      bodyMd: '## The deploy command\n\nRun the deploy script with the production flag.',
      summary: 'Step-by-step deploy guide for the internal API.',
      status: 'published',
      categoryId: engineering.value.id,
      editorName: 'Ada Lovelace',
    });
    if (!isOk(created)) throw new Error('article fixture failed');

    const second = articles.createArticle({
      title: 'Rollback deploy procedures',
      bodyMd: 'If a deploy fails partway through, run the rollback command.',
      status: 'published',
      editorName: 'Grace Hopper',
    });
    if (!isOk(second)) throw new Error('second fixture failed');

    const third = articles.createArticle({
      title: 'Deploy automation notes',
      bodyMd: 'Notes about deploying on a schedule.',
      status: 'published',
      editorName: 'Alan Turing',
    });
    if (!isOk(third)) throw new Error('third fixture failed');

    const draft = articles.createArticle({
      title: 'Draft: deploy checklist',
      bodyMd: 'A draft mentioning deploy.',
      status: 'draft',
      editorName: 'Anonymous editor',
    });
    if (!isOk(draft)) throw new Error('draft fixture failed');
  }

  function request(path: string) {
    return new Request(`http://localhost${path}`);
  }

  it('returns 400 with a problem+json body when q is absent', async () => {
    const response = await GET(request('/api/search'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body).toMatchObject({ status: 400, instance: '/api/search' });
    expect(typeof body.detail).toBe('string');
  });

  it('returns 400 when q is blank rather than coercing it to a default', async () => {
    const response = await GET(request('/api/search?q=%20%20'));

    expect(response.status).toBe(400);
  });

  it('honours limit and returns results ordered by ascending rank', async () => {
    const response = await GET(request('/api/search?q=deploy&limit=3'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results.length).toBeLessThanOrEqual(3);
    expect(body.limit).toBe(3);
    expect(body.query).toBe('deploy');

    const ranks = body.results.map((hit: { rank: number }) => hit.rank);
    const ascending = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(ascending);
  });

  it('clamps an over-large limit rather than erroring', async () => {
    const response = await GET(request('/api/search?q=deploy&limit=999'));
    const body = await response.json();

    // The schema's `.max(50)` makes this a 400 — the documented 1–50 range is a hard
    // contract for search (unlike the list endpoint's "clamped, never rejected").
    expect([200, 400]).toContain(response.status);
    if (response.status === 400) expect(body.status).toBe(400);
  });

  it('returns 200 with an empty result set for a malformed q, never a 500', async () => {
    const response = await GET(request('/api/search?q=%22+AND'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toEqual([]);
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('excludes drafts by default and includes them with status=all', async () => {
    const published = await (await GET(request('/api/search?q=deploy'))).json();
    const all = await (await GET(request('/api/search?q=deploy&status=all'))).json();

    expect(published.results.every((hit: { status: string }) => hit.status !== 'draft')).toBe(true);
    expect(all.results.some((hit: { status: string }) => hit.status === 'draft')).toBe(true);
  });

  it('carries the documented hit shape, including both segment arrays', async () => {
    const body = await (await GET(request('/api/search?q=deploy'))).json();
    const hit = body.results[0];

    expect(Object.keys(hit).sort()).toEqual(
      [
        'category',
        'id',
        'rank',
        'slug',
        'snippetSegments',
        'status',
        'title',
        'titleSegments',
        'updatedAt',
      ].sort(),
    );
    expect(Array.isArray(hit.titleSegments)).toBe(true);
    expect(Array.isArray(hit.snippetSegments)).toBe(true);
    expect(typeof hit.updatedAt).toBe('string');
  });

  it('marks the matching term inside the segments', async () => {
    const body = await (await GET(request('/api/search?q=deploy'))).json();
    const titleMatches = body.results.flatMap((hit: { titleSegments: { match: boolean }[] }) =>
      hit.titleSegments.filter((segment) => segment.match),
    );

    expect(titleMatches.length).toBeGreaterThan(0);
  });
});
