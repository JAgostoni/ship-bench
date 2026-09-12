'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import './globals.css';

/**
 * The app-level error boundary (design-spec.md §7.4, level 4).
 *
 * `global-error.tsx` replaces the root layout entirely, so it must render its own
 * `<html>`/`<body>` and import the global stylesheet itself. That is why this file
 * — and only this file — duplicates the document shell.
 *
 * `reset()` re-renders the closest error boundary; the spec's copy for this level is
 * the same as the route panel's ("same copy" per §7.4), with `Reload` as the
 * recovery action.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="bg-surface text-ink flex min-h-dvh items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <h1 className="text-[20px] leading-snug font-semibold">
              Something went wrong loading this page.
            </h1>
            {error.digest ? (
              <p className="text-ink-subtle mt-2 text-[12px] select-all">
                Reference: {error.digest}
              </p>
            ) : null}
            <div className="mt-5 flex justify-center">
              <Button variant="primary" size="md" onClick={() => reset()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
