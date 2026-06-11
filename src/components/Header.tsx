import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileTextIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";

/**
 * Global sticky header (design §1.3): logo + name → "/", search, "New article".
 *
 * The search area is the iteration-3 stub: a plain GET form to /search.
 * Iteration 4 replaces it wholesale with the SearchBox combobox (dropdown,
 * debounce, "/" shortcut).
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
          <form
            role="search"
            action="/search"
            method="get"
            className="w-full max-w-search"
          >
            <Input
              id="header-search"
              label="Search articles"
              labelHidden
              type="search"
              name="q"
              placeholder="Search articles…"
              leadingIcon={<SearchIcon />}
            />
          </form>
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
