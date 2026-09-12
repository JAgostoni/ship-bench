import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton';

/**
 * Detail first paint (design-spec.md §3.4's Loading row): breadcrumb skeleton, title
 * skeleton at 60% width, two meta skeletons, a 12-line body skeleton at 1.65
 * line-height, and a 4-item TOC skeleton.
 *
 * The 12-line body block is sized with real line-height rather than a single large
 * box, so the swap to real text does not shift the page.
 */
export default function ArticleLoading() {
  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto flex max-w-3xl gap-10">
        <div className="min-w-0 flex-1">
          <SkeletonRegion className="block">
            <Skeleton className="h-3 w-52" />
            <Skeleton className="mt-5 h-8 w-[60%]" />
            <Skeleton className="mt-3 h-3.5 w-64" />
            <Skeleton className="mt-2 h-3.5 w-40" />
            <Skeleton className="mt-6 h-9 w-24" />
            <div className="mt-8 flex flex-col gap-2.5">
              {Array.from({ length: 12 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-4"
                  // 1.65 line-height, matching `--leading-relaxed` on `.prose`.
                  style={{ width: index % 4 === 3 ? '62%' : '100%', opacity: 1 }}
                />
              ))}
            </div>
          </SkeletonRegion>
        </div>
        <div className="hidden w-(--layout-toc-w) shrink-0 xl:block">
          <SkeletonRegion className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </SkeletonRegion>
        </div>
      </div>
    </div>
  );
}
