'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useNavigationTransition } from '@/components/layout/progress-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CategorySummary } from '@/types/domain';
import { CategoryChips } from './category-chips';

export type FilterBarProps = {
  categories: Pick<CategorySummary, 'name' | 'slug' | 'articleCount'>[];
  /** The active category slug from the URL, when the route is category-scoped. */
  activeCategory?: string;
  /** Where the status/sort selects write their query string (route path only). */
  basePath: string;
  /**
   * Search mode: **the sort control is not rendered at all**
   * (design-spec.md §3.3 rule 1 and §10.6 rule 5). Ranking is server-side
   * relevance, so offering a sort would be a lie.
   */
  searchMode?: boolean;
  /** The right-aligned result count, supplied by the page as already-formatted text. */
  countLabel?: string;
  className?: string;
};

/**
 * design-spec.md §5.9 — one 36px row, `gap-2`, wrapping below 768px, holding the
 * category chips, the `Status` select, the (search-excluded) `Sort` select, and a
 * right-aligned result count.
 *
 * Every change goes through `useTransition` + `router.replace` with
 * `scroll: false`, so refining never jumps the viewport and never loses the user's
 * place (§4.1's "return-from-detail" reasoning applies equally to filters). All
 * state round-trips through the query string, so back/forward restores the exact
 * view (architecture.md §9.5).
 */
export function FilterBar({
  categories,
  activeCategory,
  basePath,
  searchMode = false,
  countLabel,
  className,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { run } = useNavigationTransition();

  const status = searchParams.get('status') ?? 'published';
  const sort = searchParams.get('sort') ?? 'updated';

  function setParam(key: string, value: string, { clear }: { clear?: string[] } = {}) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    // A filter change invalidates the current page number.
    params.delete('page');
    for (const name of clear ?? []) params.delete(name);
    const query = params.toString();
    run(() => {
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        // Two rows below 768px, one row above (§6.2's FilterBar row).
        'flex flex-wrap items-center gap-2 md:flex-nowrap',
        className,
      )}
    >
      <CategoryChips
        categories={categories}
        activeSlug={activeCategory}
        className="order-1 w-full min-w-0 md:order-none md:w-auto"
      />

      <div className="order-2 flex items-center gap-2 md:order-none">
        <Select value={status} onValueChange={(value) => setParam('status', value)}>
          <SelectTrigger aria-label="Filter by status" className="h-9 w-[9.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        {searchMode ? null : (
          <Select value={sort} onValueChange={(value) => setParam('sort', value)}>
            <SelectTrigger aria-label="Sort articles" className="h-9 w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {countLabel ? (
        <p className="text-ink-muted order-3 ml-auto text-[13px] md:order-none">{countLabel}</p>
      ) : null}
    </div>
  );
}
