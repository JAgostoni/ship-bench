import Link from 'next/link';
import { X } from 'lucide-react';
import { ArticleCard } from '@/components/articles/article-card';
import { NoResultsState } from '@/components/articles/empty-states';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/filters/filter-bar';
import { Pagination } from '@/components/filters/pagination';
import { RefiningSurface } from '@/components/filters/refining-surface';
import { formatCount } from '@/lib/format';
import type { CategorySummary, SearchHit } from '@/types/domain';
import { Highlight } from './highlight';

export type SearchResultsProps = {
  query: string;
  hits: SearchHit[];
  /** The result total, or `null` when the server did not count (§4.1's honesty rule). */
  total: number | null;
  page: number;
  totalPages: number | null;
  hasNext: boolean;
  categories: Pick<CategorySummary, 'name' | 'slug' | 'articleCount'>[];
};

/**
 * design-spec.md §3.3's results surface — an RSC, so the whole list is
 * server-rendered and the URL is the only state container (architecture.md §9.5).
 *
 * Three rules from §3.3 are encoded structurally rather than by convention:
 *
 * 1. **No sort control.** `searchMode` makes `FilterBar` omit it entirely
 *    (§10.6 rule 5). Ranking is `bm25` and the UI never re-sorts.
 * 2. **The count is a live region.** `role="status" aria-live="polite"` announces
 *    `{n} results for “{q}”` on every settled query, including the singular and the
 *    zero case (§9.3).
 * 3. **The visible `h1` is `sr-only`.** The page's own heading is
 *    "Search results"; the *visible* heading is the live count line, which is why
 *    the count is a `<p>` styled as a heading rather than an `<h2>` duplicating it.
 */
export function SearchResults({
  query,
  hits,
  total,
  page,
  totalPages,
  hasNext,
  categories,
}: SearchResultsProps) {
  const shown = hits.length;
  const count = total ?? shown;
  const countLabel = `${formatCount(count, 'result', 'results')} for “${query}”`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="sr-only">Search results</h1>
        <p
          role="status"
          aria-live="polite"
          className="text-ink-muted text-[14px] leading-snug font-medium"
        >
          {countLabel}
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear search
          </Link>
        </Button>
      </div>

      <FilterBar categories={categories} basePath="/search" searchMode className="mt-4" />

      <RefiningSurface className="mt-4">
        {shown === 0 ? (
          <NoResultsState query={query} />
        ) : (
          <div className="border-border rounded-card overflow-hidden border [&>*:last-child]:border-b-0">
            {hits.map((hit) => (
              <ArticleCard
                key={hit.id}
                title={hit.title}
                slug={hit.slug}
                summary={null}
                excerpt=""
                status={hit.status}
                category={hit.category}
                updatedAt={hit.updatedAt}
                titleNode={<Highlight segments={hit.titleSegments} />}
                summaryNode={<Highlight segments={hit.snippetSegments} />}
              />
            ))}
          </div>
        )}
      </RefiningSurface>

      <RefiningSurface>
        <Pagination
          page={page}
          totalPages={totalPages}
          hasNext={hasNext}
          basePath="/search"
          className="mt-6"
        />
      </RefiningSurface>
    </div>
  );
}
