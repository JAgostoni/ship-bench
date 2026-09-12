import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BrowseList, BrowseListSuspense } from '@/components/articles/browse-list';
import { Button } from '@/components/ui/button';
import { listQuerySchema } from '@/lib/validation/query';

export const dynamic = 'force-dynamic';

/**
 * The browse route (`architecture.md` §9.1, design-spec.md §3.2).
 *
 * Reads `searchParams` — a `Promise` in Next.js 16 — through `listQuerySchema`,
 * which coerces every malformed or unknown parameter to a default instead of
 * failing, so any shared URL renders (`architecture.md` §6.2).
 *
 * Drafts are excluded by default because the schema's `status` default is
 * `published` (design-spec.md §4.5).
 *
 * The heading and the primary action paint immediately; the count line, the filter
 * bar, the rows, and the pager stream in behind a `Suspense` boundary so a slow
 * SQLite read never blocks the first meaningfully-painted frame.
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
          <h1
            tabIndex={-1}
            className="text-ink text-[32px] leading-[1.25] font-semibold tracking-[-0.02em] outline-none"
          >
            Articles
          </h1>
          <Button asChild variant="primary" size="md">
            <Link href="/articles/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New article
            </Link>
          </Button>
        </div>

        <BrowseListSuspense>
          <BrowseList query={query} basePath="/" />
        </BrowseListSuspense>
      </div>
    </div>
  );
}
