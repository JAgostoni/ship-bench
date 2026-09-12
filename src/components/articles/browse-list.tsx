import { Suspense } from 'react';
import { ArticleList } from '@/components/articles/article-list';
import { FilterBar } from '@/components/filters/filter-bar';
import { Pagination } from '@/components/filters/pagination';
import { RefiningSurface } from '@/components/filters/refining-surface';
import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';
import { relativeTime } from '@/lib/format';
import type { ListQuery } from '@/lib/validation/query';
import { articleRepository } from '@/server/repositories/articles';
import { categoryRepository } from '@/server/repositories/categories';
import type { CategorySummary } from '@/types/domain';

export type BrowseListProps = {
  query: ListQuery;
  /** Route the filter bar and pager write to (`/`, `/search`, `/categories/[slug]`). */
  basePath: string;
  /** Fixes the category filter to the route, so `/categories/x` cannot be un-scoped. */
  category?: CategorySummary;
  /** Suppresses the pager on a route that does not paginate. */
  showPagination?: boolean;
};

/**
 * The streamed body of every browse-shaped page.
 *
 * `architecture.md` §9.1's count contract is the reason this is one component and
 * not three: the count line reports what the server **actually computed**. On page 1
 * the repository deliberately skips the `count(*)` query (§9.1's single-query
 * budget), so the page shows the visible row count; from page 2 the real total
 * exists and the pager renders `Page 2 of 3`. Nothing here ever displays a figure
 * the server did not produce (design-spec.md §4.1).
 *
 * Split from its page so `Suspense` can paint the title immediately while SQLite
 * answers — which is what makes the `loading.tsx` skeletons worth having.
 */
export async function BrowseList({
  query,
  basePath,
  category,
  showPagination = true,
}: BrowseListProps) {
  const { items, hasNext, total } = articleRepository.listArticles(query);
  const categories = categoryRepository.listWithCounts();

  // `/categories/[slug]` fixes the scope from the path, so the query's own
  // `category` is ignored rather than allowed to disagree with the URL.
  const scoped = category ?? categories.find((entry) => entry.slug === query.category) ?? null;

  const newest = items.reduce<Date | null>(
    (latest, item) => (latest === null || item.updatedAt > latest ? item.updatedAt : latest),
    null,
  );

  const label = countLine(items.length, query.status);
  const totalPages = total === null ? null : Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <>
      <p role="status" className="text-ink-muted mt-2 text-[14px]">
        {label}
        {newest ? (
          <>
            {' · updated '}
            <time dateTime={newest.toISOString()}>{relativeTime(newest)}</time>
          </>
        ) : null}
      </p>

      {/*
        `activeCategory` drives the chip's selected state; on a category route the
        chips still navigate away, which is what makes them a filter strip rather
        than a second breadcrumb.
      */}
      <FilterBar
        categories={categories}
        activeCategory={scoped?.slug ?? query.category}
        basePath={basePath}
        className="mt-4"
      />

      {/*
        The rows and pager dim to 60% while a refinement is in flight
        (design-spec.md §7.5) — the count line above deliberately stays at full
        opacity because it is the live region announcing the *new* result set.
      */}
      <RefiningSurface className="mt-4">
        <ArticleList
          items={items}
          emptyState={{
            count: items.length,
            // A search term on a category page is still a search (design-spec.md
            // UX20), which is why this checks `q` before the category.
            query: query.q || undefined,
            category: scoped,
            hasFilters:
              query.q === '' &&
              (query.status !== 'published' || (scoped !== null && category !== undefined)),
          }}
        />
      </RefiningSurface>

      {showPagination ? (
        <RefiningSurface>
          <Pagination
            page={query.page}
            totalPages={totalPages}
            hasNext={hasNext}
            basePath={basePath}
            className="mt-6"
          />
        </RefiningSurface>
      ) : null}
    </>
  );
}

/** `7 published` / `12 drafts` / `3 articles` — the count line's leading phrase. */
function countLine(count: number, status: ListQuery['status']): string {
  const noun = count === 1 ? 'article' : 'articles';
  if (status === 'published') return `${count} published`;
  if (status === 'draft') return `${count} ${count === 1 ? 'draft' : 'drafts'}`;
  return `${count} ${noun}`;
}

/** Six skeleton rows at the card's exact 72px height (design-spec.md §3.2). */
export function BrowseListSkeleton() {
  return (
    <SkeletonRegion className="mt-6">
      <Skeleton className="h-4 w-48" />
      <div className="border-border rounded-card mt-4 overflow-hidden border">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="border-border flex h-[72px] min-h-[72px] flex-col justify-center border-b px-4 last:border-b-0"
          >
            <Skeleton className="h-[17px] w-2/3" />
            <Skeleton className="mt-2 h-[14px] w-full" />
            <Skeleton className="mt-2 h-[12px] w-40" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Wraps the streamed list so a page can render its heading first. */
export function BrowseListSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<BrowseListSkeleton />}>{children}</Suspense>;
}
