'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Menu, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/search/command-palette';
import { SearchInput } from '@/components/search/search-input';
import { MobileNav } from './mobile-nav';
import { ProgressBar } from './progress-bar';
import { ThemeToggle } from './theme-toggle';

export type HeaderProps = {
  appName: string;
  /** The sidebar's `<nav>`, reused inside the mobile drawer. */
  navigation: React.ReactNode;
  /** The current `q`, so the field seeds from the URL on every route. */
  initialQuery?: string;
};

/**
 * The sticky header from design-spec.md §2.1: `☰` (below 1024px only), wordmark,
 * the search field, `+ New article`, the theme toggle, and the `Editing as` chip.
 *
 * **The ⌘K palette is mounted here**, once, so the shortcut works on every route
 * (task 5.7). The header owns its `open` state because two other controls in the
 * same header also open it — the key-cap hint inside the field and the mobile
 * search row — and lifting the state is cheaper than three listeners racing to
 * toggle it.
 *
 * **Below 768px the field collapses to an icon.** Tapping it reveals a full-width
 * row beneath the header with focus applied (§6.5); `Escape` or a tap outside
 * collapses it again. The expanded row is a separate mount of `SearchInput`, so the
 * icon's `aria-expanded` always describes something real.
 */
export function Header({ appName, navigation, initialQuery = '' }: HeaderProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collapse the mobile search row when the user taps elsewhere.
  useEffect(() => {
    if (!expanded) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [expanded]);

  // ⌘K / Ctrl+K from anywhere. Registered once on the header, which is mounted on
  // every route.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const openPalette = () => setPaletteOpen(true);

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

        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-control text-ink px-1 text-[15px] font-semibold"
        >
          {appName}
        </button>

        {/* ≥768px: the inline field. <768px is served by the icon + expanded row. */}
        <div ref={containerRef} className="mx-auto hidden max-w-[520px] min-w-0 flex-1 md:flex">
          <SearchInput initialQuery={initialQuery} onOpenPalette={openPalette} />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 md:hidden"
          aria-label="Search articles"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button asChild variant="primary" size="md">
            <Link href="/articles/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {/* §6.6 requires the label at 834px; only <768px narrows it to an icon. */}
              <span className="hidden md:inline">New article</span>
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

      {expanded ? (
        <div className="border-border flex items-center gap-2 border-t px-4 py-2 md:hidden">
          <SearchInput
            initialQuery={initialQuery}
            autoFocus
            onCollapse={() => setExpanded(false)}
            onOpenPalette={openPalette}
          />
        </div>
      ) : null}

      <ProgressBar />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
