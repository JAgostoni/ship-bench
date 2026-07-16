"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  /** Clears error state and re-renders children (Next error boundary). */
  reset: () => void;
  /** Preferred recovery: re-fetch + re-render segment children (Next 16). */
  unstable_retry?: () => void;
};

/**
 * Global route error boundary — design S7.
 * Client Component; no stack traces in the UI.
 */
export default function Error({
  error,
  reset,
  unstable_retry,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  const tryAgain = () => {
    if (typeof unstable_retry === "function") {
      unstable_retry();
      return;
    }
    reset();
  };

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <AlertTriangle
        className="mb-4 size-10 text-[var(--color-text-muted)]"
        strokeWidth={1.5}
        aria-hidden
      />
      <h1 className="text-lg font-semibold text-[var(--color-text)]">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
        An unexpected error occurred. You can try again or return to the article
        list.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-[var(--color-text-muted)]">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={tryAgain}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Back to articles
        </Link>
      </div>
    </div>
  );
}
