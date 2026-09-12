import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequestResponse, problemResponse } from '@/server/http';
import { searchRepository } from '@/server/repositories/search';
import { toSearchHitWire } from '@/server/serialize';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/search` — the shape from `architecture.md` §7.3, including `rank` and
 * both segment arrays.
 *
 * **`q` is required and empty is a `400`.** §7.4's *"invalid params are coerced to
 * defaults, never 400"* rule belongs to the **list** contract, where every parameter
 * has a meaningful default. `q` does not: an empty search has no result set to rank,
 * and the spec names `400` explicitly for this route.
 *
 * A *malformed* `q` is a different thing entirely and must **never** fail:
 * `toFtsQuery` strips FTS5 operators before the `MATCH` is built, and the repository
 * falls back to an indexed `LIKE` scan on `SqliteError`, so `q=%22+AND` answers `200`
 * with an empty `results` array. That is the end-to-end proof the brief's
 * no-silent-failures requirement is about, and it is asserted in `route.test.ts`.
 */
const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'A query is required.')
    .max(200, 'Search terms are limited to 200 characters.'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['published', 'draft', 'all']).default('published'),
});

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('q');

    // Checked before Zod so an absent or blank `q` produces the documented 400
    // rather than a coercion to a default that would search for nothing.
    if (raw === null || raw.trim() === '') {
      return badRequestResponse(request, 'The "q" query parameter is required.');
    }

    const parsed = searchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return badRequestResponse(request, parsed.error.issues[0]?.message ?? 'Invalid query.');
    }

    const { q, limit, status } = parsed.data;
    const result = searchRepository.searchArticles(q, { limit, status });

    if (!result.ok) throw result.error;

    const { results } = result.value;

    return NextResponse.json(
      {
        query: q,
        total: searchRepository.countSearchResults(q, { status }),
        limit,
        results: results.map(toSearchHitWire),
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemResponse(error, request);
  }
}
