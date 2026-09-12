// Task 4.7's "done when" (`curl /api/health` → 200 with `reachable: true`) covers
// the happy path. The 503 branch is the one the brief's "handle errors gracefully
// — no silent failures" requirement is really about, and it cannot be reached with
// `curl` against a healthy developer database, so it is pinned here.
//
// `countArticles()` is made to throw by closing the SQLite handle the repository is
// bound to. That is the real failure shape for this route — a closed or
// misconfigured database — rather than a mocked throw, so the test exercises the
// route's own `try`/`catch` and not a stub of it.
import { afterEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { GET } from './route';

type TestDb = ReturnType<typeof createTestDb>;

const open: TestDb[] = [];

afterEach(() => {
  while (open.length > 0) {
    const handle = open.pop();
    try {
      handle?.close();
    } catch {
      // The degraded case has already closed the handle.
    }
  }
});

function track(handle: TestDb): TestDb {
  open.push(handle);
  return handle;
}

describe('GET /api/health', () => {
  it('reports ok with a reachable database and the real article count', async () => {
    const handle = track(createTestDb());
    const { articles } = await import('@/server/db/schema');
    handle.db
      .insert(articles)
      .values([
        { title: 'One', slug: 'one', bodyMd: 'x', status: 'published', version: 1 },
        { title: 'Two', slug: 'two', bodyMd: 'y', status: 'draft', version: 1 },
      ])
      .run();

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      database: { reachable: true, migration: '0000_init', articleCount: 2 },
    });
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('reports degraded with 503 when the database probe fails', async () => {
    const handle = createTestDb();
    handle.close();

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'degraded',
      database: { reachable: false, migration: '0000_init', articleCount: 0 },
    });
  });
});
