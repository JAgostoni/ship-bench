import { Skeleton } from '@/components/ui/skeleton';

/**
 * The edit route's loading state — the same shape as `new/loading.tsx`, laid out from
 * the stored article's field order so the transition into the real form does not
 * shift anything (design-spec.md §5.9's stability rule, §7.5's editor row).
 */
export default function EditArticleLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-6"
      role="status"
      aria-label="Loading editor…"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="relative h-[520px]">
          <Skeleton className="h-full w-full" />
          <p className="text-ink-subtle absolute inset-0 flex items-center justify-center text-[13px]">
            Loading editor…
          </p>
        </div>
      </div>
    </div>
  );
}
