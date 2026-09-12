import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ArticleList } from '@/components/articles/article-list';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';
import { relativeTime } from '@/lib/format';
import { listQuerySchema } from '@/lib/validation/query';
import { articleRepository } from '@/server/repositories/articles';
import { categoryRepository } from '@/server/repositories/categories';

/**
 * The browse route (`architecture.md` §9.1, design-spec.md §3.2).
 *
 * Reads `searchParams` — a `Promise` in Next.js 16 — through `listQuerySchema`,
 * which coerces every malformed or unknown parameter to a default instead of
 * failing, so any shared URL renders (`architecture.md` §6.2).
 *
 * Drafts are excluded by default because the schema's `status` default is
 * `published` (design-spec.md §4.5).
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = listQuerySchema.parse(await searchParams);

  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-ink text-[32px] leading-[1.25] font-semibold tracking-[-0.02em]">
            Articles
          </h1>
          <Button asChild variant="primary" size="md">
            <Link href="/articles/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New article
            </Link>
          </Button>
        </div>

        <Suspense fallback={<ListSkeleton />}>
          <BrowseList query={query} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * The streamed half of the page: the count line and the rows.
 *
 * Split from the shell of the page so `Articles` and the `New article` action paint
 * immediately while SQLite answers.
 */
async function BrowseList({ query }: { query: ReturnType<typeof listQuerySchema.parse> }) {
  const { items, hasNext } = articleRepository.listArticles(query);
  // `hasNext` is not rendered yet — pagination is iteration 5's deliverable and
  // this iteration is explicitly read-only for browsing — but it is still read
  // here so the query's pager contract is exercised on the real path.
  void hasNext;
  const categories = categoryRepository.listWithCounts();

  // On page 1 the repository deliberately does not compute a total
  // (`architecture.md` §9.1), so the count is the number of rows actually rendered
  // — the UI never displays a figure the server did not compute (design-spec.md
  // §4.1).
  const newest = items.reduce<Date | null>(
    (latest, item) => (latest === null || item.updatedAt > latest ? item.updatedAt : latest),
    null,
  );

  return (
    <>
      <p role="status" className="text-ink-muted mt-2 text-[14px]">
        {items.length} {query.status === 'published' ? 'published' : query.status}
        {newest ? (
          <>
            {' · updated '}
            <time dateTime={newest.toISOString()}>{relativeTime(newest)}</time>
          </>
        ) : null}
      </p>

      <div className="mt-4">
        <ArticleList
          items={items}
          emptyState={{
            count: items.length,
            hasFilters: query.category !== undefined || query.status !== 'published',
            category:
              query.category !== undefined
                ? (categories.find((c) => c.slug === query.category) ?? null)
                : null,
          }}
        />
      </div>
    </>
  );
}

/**
 * Six skeleton rows at the card's exact 72px height (design-spec.md §3.2's loading
 * state). The region carries `role="status"`; the individual blocks are
 * `aria-hidden`, so a screen reader hears one "Loading" rather than six blocks.
 */
function ListSkeleton() {
  return (
    <SkeletonRegion className="mt-6">
      <Skeleton className="h-4 w-48" />
      <div className="border-border rounded-card mt-4 overflow-hidden border">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="border-border border-b px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-[17px] w-2/3" />
            <Skeleton className="mt-2 h-[14px] w-full" />
            <Skeleton className="mt-2 h-[12px] w-40" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
