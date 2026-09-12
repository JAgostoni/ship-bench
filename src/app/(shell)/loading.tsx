import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

/**
 * `/` first paint (design-spec.md §3.2): the page title, the count line, and **six
 * skeleton rows at exactly 72px**. Never a spinner — §7.5 lists "a bare centered
 * spinner on a full page" under the things the app must not do.
 *
 * The shell (header, sidebar, logo) is already on screen by the time this renders,
 * so only the content column is skeletonised.
 */
export default function BrowseLoading() {
  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <SkeletonRegion className="block">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="mt-3 h-4 w-56" />
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
      </div>
    </div>
  );
}
