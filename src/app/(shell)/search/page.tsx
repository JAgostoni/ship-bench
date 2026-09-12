import type { Metadata } from 'next';
import { BrowseList, BrowseListSuspense } from '@/components/articles/browse-list';
import { SearchResults } from '@/components/search/search-results';
import { listQuerySchema } from '@/lib/validation/query';
import { categoryRepository } from '@/server/repositories/categories';
import { searchRepository } from '@/server/repositories/search';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search',
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * `/search` (design-spec.md §3.3, architecture.md §6.2).
 *
 * **The empty-`q` rule is the interesting one.** §3.3 rule 7: an empty query
 * renders the browse list, not an empty state — "a URL with `?q=` and nothing else
 * must always render something useful". The route therefore has two honest modes,
 * and never fabricates a "0 results" for a search the user did not make.
 *
 * Search **never** surfaces a SQLite error: `toFtsQuery` strips FTS operators
 * before the `MATCH` is built (iteration 2.3), and the repository degrades to an
 * indexed `LIKE` scan on `SqliteError` (iteration 3.6). `/search?q=%22+AND` is the
 * end-to-end proof and is asserted in the route-handler test.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = listQuerySchema.parse(await searchParams);

  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        {query.q === '' ? <BrowseMode query={query} /> : <SearchMode query={query} />}
      </div>
    </div>
  );
}

/**
 * `?q=` with nothing else — the same list `/` renders. Reusing `BrowseList` rather
 * than re-implementing it is what keeps the two from drifting.
 */
async function BrowseMode({ query }: { query: ReturnType<typeof listQuerySchema.parse> }) {
  return (
    <>
      <h1
        tabIndex={-1}
        className="text-ink text-[32px] leading-[1.25] font-semibold tracking-[-0.02em] outline-none"
      >
        Articles
      </h1>
      <BrowseListSuspense>
        <BrowseList query={query} basePath="/search" />
      </BrowseListSuspense>
    </>
  );
}

/**
 * Search mode, rendered synchronously (there is no second data source to stream
 * against) so the live region and the rows arrive together — a count that announces
 * before its results would be a lie for as long as the gap lasts.
 *
 * `limit` is the page size so `page` walks the ranked set; `total` stays `null`
 * because `searchArticles` deliberately does not count. The pager consequently
 * renders `Page 1` + `Next →` rather than inventing a last page (design-spec.md
 * §4.1).
 */
function SearchMode({ query }: { query: ReturnType<typeof listQuerySchema.parse> }) {
  const result = searchRepository.searchArticles(query.q, {
    limit: query.pageSize,
    status: query.status,
    offset: (query.page - 1) * query.pageSize,
  });

  if (!result.ok) {
    // The repository degrades internally, so this is unreachable. Throwing rather
    // than rendering an empty list keeps a failure from masquerading as "no
    // results" — the brief's no-silent-failures rule.
    throw result.error;
  }

  const { results } = result.value;

  return (
    <SearchResults
      query={query.q}
      hits={results}
      total={results.length}
      page={query.page}
      totalPages={null}
      hasNext={results.length >= query.pageSize}
      categories={categoryRepository.listWithCounts()}
    />
  );
}
