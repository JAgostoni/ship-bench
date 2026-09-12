import Link from 'next/link';
import { ChevronDown, Command, Menu, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';
import { ProgressBar } from './progress-bar';
import { ThemeToggle } from './theme-toggle';

export type HeaderProps = {
  appName: string;
  /** The sidebar's `<nav>`, reused inside the mobile drawer. */
  navigation: React.ReactNode;
};

/**
 * The sticky header from design-spec.md §2.1: `☰` (below 1024px only), wordmark,
 * the centered search field, `+ New article`, the theme toggle, and the
 * `Editing as` chip.
 *
 * Two later-iteration affordances are present but inert here, and both are
 * documented rather than hidden:
 *
 * - The search field is a real `<form role="search">` that GETs `/search`, so the
 *   header's stated job — search present on every screen (design-spec.md §4.2) —
 *   already works with a labelled, focusable input. Iteration 5 swaps it for the
 *   debounced client `SearchInput` that owns `router.replace`.
 * - The `Editing as` chip renders the documented default. Iteration 6 replaces it
 *   with the cookie-backed dialog (design-spec.md §4.6).
 */
export function Header({ appName, navigation }: HeaderProps) {
  return (
    <>
      <div className="mx-auto flex h-(--layout-header-h) items-center gap-2 px-4 md:gap-3 md:px-6">
        <MobileNav
          appName={appName}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          }
        >
          {navigation}
        </MobileNav>

        <Link
          href="/"
          className="rounded-control text-ink px-1 text-[15px] font-semibold no-underline"
        >
          {appName}
        </Link>

        <form
          role="search"
          action="/search"
          className="mx-auto hidden max-w-[520px] min-w-0 flex-1 items-center md:flex"
        >
          <label htmlFor="header-search" className="sr-only">
            Search articles
          </label>
          <div className="rounded-control bg-surface-muted border-border focus-within:border-border-strong flex h-9 w-full items-center gap-2 border px-3">
            <Search className="text-ink-subtle h-4 w-4 shrink-0" aria-hidden="true" />
            <input
              id="header-search"
              name="q"
              type="search"
              role="searchbox"
              aria-label="Search articles"
              placeholder="Search articles…"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              className="text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent text-[14px] outline-none"
            />
            <span
              aria-hidden="true"
              className="rounded-control bg-surface-sunken text-ink-subtle hidden h-5 items-center gap-0.5 px-1.5 text-[11px] xl:flex"
            >
              <Command className="h-3 w-3" aria-hidden="true" />K
            </span>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button asChild variant="primary" size="md">
            <Link href="/articles/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New article
            </Link>
          </Button>
          <ThemeToggle />
          <button
            type="button"
            className="rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink hidden items-center gap-1.5 px-2 py-1.5 text-[13px] lg:flex"
          >
            <span className="text-ink-subtle">Editing as</span>
            <span className="text-ink font-medium">Anonymous editor</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <ProgressBar />
    </>
  );
}
