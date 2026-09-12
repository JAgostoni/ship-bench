import { NextResponse } from 'next/server';
import { articleRepository } from '@/server/repositories/articles';

type HealthPayload = {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  database: { reachable: boolean; migration: string; articleCount: number };
};

/**
 * `GET /api/health` — the exact shape from `architecture.md` §7.3.
 *
 * Two consumers depend on it: Playwright's `webServer` readiness probe in
 * iteration 7, and any operator checking whether the database is reachable. It
 * therefore reports a failure **honestly**, with `503` and `"status": "degraded"`,
 * rather than throwing — which is what makes `curl` a usable check.
 *
 * The route is read-only by design; the destructive `POST /api/test/reset` is
 * iteration 6's deliverable (backlog B8).
 */
export const dynamic = 'force-dynamic';

/** The schema baseline tag (`architecture.md` §7.3's example reads `0000_init`). */
const MIGRATION_TAG = '0000_init';

export function GET(): NextResponse<HealthPayload> {
  const uptimeSeconds = Math.round(process.uptime());

  try {
    const articleCount = articleRepository.countArticles();

    return NextResponse.json<HealthPayload>(
      {
        status: 'ok',
        uptimeSeconds,
        database: { reachable: true, migration: MIGRATION_TAG, articleCount },
      },
      { status: 200 },
    );
  } catch {
    // A probe that throws reports nothing. The failure is carried in the payload
    // and the status code; the error text stays out of the body because this
    // response is unauthenticated.
    return NextResponse.json<HealthPayload>(
      {
        status: 'degraded',
        uptimeSeconds,
        database: { reachable: false, migration: MIGRATION_TAG, articleCount: 0 },
      },
      { status: 503 },
    );
  }
}
