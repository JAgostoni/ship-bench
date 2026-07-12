import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Sticky app header: wordmark, search placeholder, New article.
 * Search is non-functional until Iteration 5.
 * Responsive: two rows below md (logo+New / search) — design §4.2.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2 md:h-16 md:flex-row md:items-center md:gap-4 md:px-6 md:py-0">
        {/* Row 1 (mobile): logo + New; single row on md+ via flex contents */}
        <div className="flex h-10 items-center justify-between gap-3 md:contents">
          <Link
            href="/"
            className="shrink-0 text-base font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Knowledge Base
          </Link>

          <Link
            href="/articles/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] md:order-3"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">New article</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Row 2 (mobile): full-width search; centered max-w-md on md+ */}
        <div className="min-w-0 flex-1 md:flex md:justify-center" role="search">
          <label className="sr-only" htmlFor="header-search">
            Search articles
          </label>
          <input
            id="header-search"
            type="search"
            name="q"
            placeholder="Search articles…"
            disabled
            title="Search will be available in a later iteration"
            className="h-10 w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 text-sm text-[var(--color-text-muted)] placeholder:text-[var(--color-text-muted)] opacity-80 md:mx-auto"
            aria-disabled="true"
          />
        </div>
      </div>
    </header>
  );
}
