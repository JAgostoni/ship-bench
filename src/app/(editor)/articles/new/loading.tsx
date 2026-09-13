import { Skeleton } from '@/components/ui/skeleton';

/**
 * The editor's loading state (design-spec.md §7.5's "Editor bundle" row).
 *
 * A layout-matched skeleton — the title input, the slug line, the summary, the two-up
 * row, and the 520px editor block — with a centered `Loading editor…` label. **Never a
 * bare spinner**, and no shimmer, because the editor chunk is already in flight and a
 * shimmer would animate on every navigation into the route.
 */
export default function NewArticleLoading() {
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
