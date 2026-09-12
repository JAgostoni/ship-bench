import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * The article-specific 404 (design-spec.md §3.4: "Never the generic 404").
 *
 * It sits in the `[slug]` segment, so `notFound()` from the detail page renders
 * this instead of the app-level `not-found.tsx`. The copy is exact and both exits
 * from §3.1's table are present: browse and search.
 */
export default function ArticleNotFound() {
  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Search className="h-8 w-8" aria-hidden="true" />}
          title="We couldn't find that article."
          description="It may have been archived or the link may be wrong."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="primary" size="md">
                <Link href="/">Browse all articles</Link>
              </Button>
              <Button asChild variant="secondary" size="md">
                <Link href="/search">Search</Link>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
