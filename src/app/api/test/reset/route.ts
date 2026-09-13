import { NextResponse } from 'next/server';
import { assertJsonContentType, assertSameOrigin, problemResponse } from '@/server/http';
import { rebuildSearchIndex } from '@/server/db/search-index';
import { SEED_ARTICLES, SEED_CATEGORIES, seed } from '@/server/db/seed';
import { getDb } from '@/server/db/current';

export const dynamic = 'force-dynamic';

/**
 * `POST /api/test/reset` — the deterministic-reset hook the Playwright suite depends
 * on (`architecture.md` §7.3, §9.7).
 *
 * **Guarded, and invisible when the guard is off.** `E2E_TEST_MODE !== '1'` returns a
 * bare `404` with no body, so in any real deployment the route's existence is not
 * observable and its destructive behaviour is unreachable. The check is the *first*
 * statement rather than a middleware concern, because it must not be possible to reach
 * the truncation by any path.
 *
 * **It calls `seed()` rather than reimplementing the inserts.** `seed()` is already
 * idempotent, already covered by the iteration-1 tests, and is what `npm run db:seed`
 * uses — so the E2E dataset and a developer's local dataset are the same rows by
 * construction rather than by two copies of an insert loop agreeing. The
 * `e2e/fixtures/seed.json` artifact that iteration 7 consumes is generated from the
 * same arrays (`npm run db:fixture`), so all three stay in step.
 *
 * The only addition over `seed()` is an **explicit index rebuild**: a bulk re-seed is
 * precisely the case where an FTS5 index left subtly stale would be hardest to
 * attribute, and `'rebuild'` is the documented recovery form (§8.8's
 * `npm run db:reindex`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.E2E_TEST_MODE !== '1') {
    // A bare 404 with no body: the endpoint is not merely disabled, it is absent.
    return new NextResponse(null, { status: 404 });
  }

  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const unsupported = assertJsonContentType(request);
  if (unsupported) return unsupported;

  try {
    // `seed()` deletes and re-inserts inside its own transaction, so a failure cannot
    // leave a partial dataset for a spec to assert against.
    seed(getDb());
    rebuildSearchIndex();

    return NextResponse.json(
      {
        reset: true,
        articles: SEED_ARTICLES.length,
        categories: SEED_CATEGORIES.length,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemResponse(error, request);
  }
}
