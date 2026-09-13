import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `POST /api/test/reset` (iteration 6.8).
 *
 * Two things are worth proving rather than assuming:
 *
 * 1. **The guard is a 404 with an empty body**, not a 403 and not a message. In a real
 *    deployment the endpoint must be indistinguishable from a path that does not
 *    exist, so the assertion is on the raw text of the response.
 * 2. **The rebuild works.** After a reset, an FTS5 search must find the fixture's own
 *    words. That is the assertion which catches a reset that inserted rows but left the
 *    index stale — the failure mode a Playwright run would otherwise blame on the test.
 */

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock('@/server/logger', () => ({ logger: { info: () => undefined } }));

const { POST } = await import('./route');
const { createSearchRepository } = await import('@/server/repositories/search');
const { setDb } = await import('@/server/db/current');
const { createTestDb } = await import('@/test/db');

type TestDb = ReturnType<typeof createTestDb>;

const BASE = 'http://localhost/api/test/reset';

function resetRequest(): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost',
      host: 'localhost',
    },
    // The route reads no body, but a JSON content type is what its guard requires.
    body: '{}',
  });
}

describe('POST /api/test/reset', () => {
  let handle: TestDb;
  const originalMode = process.env.E2E_TEST_MODE;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
    if (originalMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = originalMode;
  });

  it('returns 404 with an empty body when E2E_TEST_MODE is unset', async () => {
    delete process.env.E2E_TEST_MODE;

    const response = await POST(resetRequest());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });

  it('returns 404 when E2E_TEST_MODE is "0" rather than "1"', async () => {
    process.env.E2E_TEST_MODE = '0';

    const response = await POST(resetRequest());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });

  it('resets to the fixture set and reports its counts', async () => {
    process.env.E2E_TEST_MODE = '1';

    const response = await POST(resetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ reset: true, articles: 9, categories: 4 });
  });

  it('rebuilds the search index so a fixture article is findable afterwards', async () => {
    process.env.E2E_TEST_MODE = '1';

    // Pollute the database first, so the assertion cannot pass on a database that was
    // already in the right shape.
    const { createArticleRepository } = await import('@/server/repositories/articles');
    createArticleRepository(handle.db).createArticle({
      title: 'Zzz pollution',
      bodyMd: 'nothing to see',
      editorName: 'Ada Lovelace',
    });

    await POST(resetRequest());

    // Re-install the handle: `createTestDb` already did, but `POST` resolves the
    // repository lazily, so this makes the intent explicit.
    setDb(handle.db);

    const search = createSearchRepository(handle.db).searchArticles('deploy', { limit: 10 });
    expect(search.ok).toBe(true);
    if (!search.ok) return;

    // The fixture's `Deploying the API to Production` is the deterministic top hit.
    expect(search.value.results.length).toBeGreaterThan(0);
    expect(search.value.results[0].slug).toBe('deploying-the-api-to-production');

    // And the pollution is gone: the fixture replaced the whole dataset.
    const all = createSearchRepository(handle.db).searchArticles('pollution', { limit: 10 });
    if (all.ok) expect(all.value.results).toHaveLength(0);
  });

  it('is idempotent: a second reset leaves the same counts and no duplicates', async () => {
    process.env.E2E_TEST_MODE = '1';

    await POST(resetRequest());
    const second = await POST(resetRequest());
    const body = await second.json();

    expect(body).toEqual({ reset: true, articles: 9, categories: 4 });

    const { createArticleRepository } = await import('@/server/repositories/articles');
    expect(createArticleRepository(handle.db).countArticles()).toBe(9);
  });
});
