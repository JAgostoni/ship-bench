import Link from 'next/link';
import { Search, SearchX } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * The global 404 (design-spec.md §3.4 / §3.1's 404 row): `Browse all articles` plus
 * a route to search. It sits at the app root and is also what Next.js renders for
 * any unmatched URL.
 *
 * The search affordance is a real GET form to `/search` rather than an embedded
 * `SearchInput`, because the client input is iteration 5's deliverable; the form
 * still gives the 404 the search exit §3.1 requires.
 *
 * `force-dynamic` because this page composes `AppLayout`, which reads category
 * counts from SQLite. The handle is created by `src/instrumentation.ts` at server
 * boot, so a static-prerender pass at build time would find no database — the same
 * constraint the `(shell)` group layout documents.
 */
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <AppLayout>
      <div className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            icon={<SearchX className="h-8 w-8" aria-hidden="true" />}
            title={"We couldn't find that page."}
            description="The link may be wrong, or the page may have moved."
            action={
              <div className="flex flex-col items-center gap-4">
                <Button asChild variant="primary" size="md">
                  <Link href="/">Browse all articles</Link>
                </Button>
                <form role="search" action="/search" className="flex w-full gap-2">
                  <label htmlFor="not-found-search" className="sr-only">
                    Search articles
                  </label>
                  <input
                    id="not-found-search"
                    name="q"
                    type="search"
                    role="searchbox"
                    aria-label="Search articles"
                    placeholder="Search articles…"
                    autoComplete="off"
                    maxLength={200}
                    className="rounded-control border-border-strong bg-surface text-ink placeholder:text-ink-subtle focus-visible:border-accent h-9 w-64 border px-3 text-[14px] outline-none"
                  />
                  <Button variant="secondary" size="md" type="submit">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search
                  </Button>
                </form>
              </div>
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}
