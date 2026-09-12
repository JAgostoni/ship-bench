import { BrowseListSkeleton } from '@/components/articles/browse-list';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * `/categories/[slug]` first paint (design-spec.md §7.5): breadcrumb, title, and 6
 * skeleton rows at the card's exact 72px height.
 */
export default function CategoryLoading() {
  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-5 h-8 w-56" />
        <BrowseListSkeleton />
      </div>
    </div>
  );
}
