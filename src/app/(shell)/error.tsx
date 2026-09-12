'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * The route error panel (design-spec.md §7.4, level 3).
 *
 * It renders **inside** the shell, so the header and sidebar stay usable and a user
 * can navigate away without a reload. `retry()` re-fetches and re-renders the
 * segment.
 *
 * The reference is `error.digest` — the automatically generated hash Next.js uses
 * to correlate a client error with the server log (see `error.js` in the
 * version-matched Next docs). A stack trace is never shown.
 */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div role="alert" className="rounded-card border-border bg-surface border p-6">
          <h1 className="text-ink text-[20px] leading-snug font-semibold">
            Something went wrong loading this page.
          </h1>
          {error.digest ? (
            <p className="text-ink-subtle mt-2 text-[12px] select-all">Reference: {error.digest}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" size="md" onClick={() => retry()}>
              Try again
            </Button>
            <Button asChild variant="secondary" size="md">
              <Link href="/">Go to all articles</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
