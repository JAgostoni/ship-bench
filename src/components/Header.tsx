import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/SearchBox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileTextIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";

/**
 * Global sticky header (design §1.3): logo + name → "/", SearchBox combobox,
 * "New article".
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-page items-center gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 text-md font-semibold text-text-secondary hover:text-text hover:underline"
        >
          <FileTextIcon size={20} />
          {/* Below 768px only the glyph shows; the link stays labeled (§3.2). */}
          <span className="max-md:sr-only">Team KB</span>
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          {/* SearchBox reads useSearchParams (the /search pre-fill), which
              requires a Suspense boundary during prerender. */}
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>
        </div>
        <Button
          href="/articles/new"
          variant="primary"
          icon={<PlusIcon />}
          aria-label="New article"
          className="shrink-0"
        >
          {/* Below 768px the button is icon-only at 44×44 (§3.2/§3.3). */}
          <span className="max-md:sr-only">New article</span>
        </Button>
      </div>
    </header>
  );
}

/** Visually identical placeholder shown only while the SearchBox suspends. */
function SearchBoxFallback() {
  return (
    <div role="search" className="w-full max-w-search">
      <Input
        id="header-search"
        label="Search articles"
        labelHidden
        type="search"
        placeholder="Search articles…"
        leadingIcon={<SearchIcon />}
        readOnly
      />
    </div>
  );
}
