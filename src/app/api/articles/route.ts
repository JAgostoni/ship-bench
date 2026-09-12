import { NextResponse } from 'next/server';
import { listQuerySchema } from '@/lib/validation/query';
import { problemResponse } from '@/server/http';
import { articleRepository } from '@/server/repositories/articles';
import { searchRepository } from '@/server/repositories/search';
import { toArticleWire } from '@/server/serialize';
import type { ArticleListItem } from '@/types/domain';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/articles` — the paginated list envelope from `architecture.md` §7.3.
 *
 * Thin by design (§4 rule 2): parse → validate with Zod → call a repository → map
 * errors. No SQL, no business rules beyond orchestration.
 *
 * **`?q=` delegates to FTS5**, per §7.3's parameter table, and still answers with the
 * same list envelope. Relevance ordering is then the only ordering: §3.3 rule 1 says
 * a ranked set is never re-sorted, so `sort` is ignored while `q` is present.
 *
 * `total` is always computed here, unlike the server-rendered browse page. §4.1's
 * "never display a number the server did not compute" is about the UI being honest
 * with a single query; this contract *promises* numeric `total` and `totalPages`, so
 * the route asks the repository to count.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const query = listQuerySchema.parse(Object.fromEntries(url.searchParams));

    const { items, total } = resolveItems(query);

    return NextResponse.json(
      {
        items: items.map(toArticleWire),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemResponse(error, request);
  }
}

type ParsedQuery = ReturnType<typeof listQuerySchema.parse>;

/**
 * Two modes, one envelope. In search mode the ranked ids are hydrated in a single
 * repository call, so an item still carries the real `version`, `publishedAt`, and
 * `excerpt` the contract lists rather than a row of `null`s.
 */
function resolveItems(query: ParsedQuery): { items: ArticleListItem[]; total: number } {
  if (query.q === '') {
    const page = articleRepository.listArticles(query, { forceTotal: true });
    return { items: page.items, total: page.total ?? page.items.length };
  }

  const result = searchRepository.searchArticles(query.q, {
    limit: query.pageSize,
    status: query.status,
    offset: (query.page - 1) * query.pageSize,
  });
  if (!result.ok) throw result.error;

  const ranked = result.value.results;
  const byId = new Map(
    articleRepository.listByIds(ranked.map((hit) => hit.id)).map((item) => [item.id, item]),
  );
  // The map is indexed by id, so re-projecting through `ranked` restores relevance
  // order — SQLite's `IN` clause does not preserve it.
  const items = ranked.flatMap((hit) => {
    const item = byId.get(hit.id);
    return item ? [item] : [];
  });

  return { items, total: searchRepository.countSearchResults(query.q, { status: query.status }) };
}
