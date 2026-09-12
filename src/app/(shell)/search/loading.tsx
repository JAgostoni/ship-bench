import { BrowseListSkeleton } from '@/components/articles/browse-list';

/**
 * `/search` first paint (design-spec.md §7.5): the shell plus a count-line skeleton
 * and 3 skeleton rows, matching the results surface the data will fill.
 */
export default function SearchLoading() {
  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-control bg-surface-sunken h-5 w-56" aria-hidden="true" />
          <div className="rounded-control bg-surface-sunken h-8 w-32" aria-hidden="true" />
        </div>
        <BrowseListSkeleton />
      </div>
    </div>
  );
}
