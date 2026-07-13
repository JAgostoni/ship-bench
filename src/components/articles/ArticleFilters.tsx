import Link from "next/link";
import type { ListArticlesStatus } from "@/lib/queries/articles";
import { Select } from "@/components/ui/Select";

export type FilterOption = {
  id: string;
  name: string;
  slug: string;
};

type ArticleFiltersProps = {
  status: ListArticlesStatus;
  categorySlug?: string;
  tagSlug?: string;
  categories: FilterOption[];
  tags: FilterOption[];
};

function buildFilterHref(opts: {
  status?: ListArticlesStatus;
  category?: string | null;
  tag?: string | null;
}): string {
  const params = new URLSearchParams();
  const status = opts.status ?? "PUBLISHED";
  if (status !== "PUBLISHED") {
    params.set("status", status);
  }
  if (opts.category) {
    params.set("category", opts.category);
  }
  if (opts.tag) {
    params.set("tag", opts.tag);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

const chipBase =
  "inline-flex h-9 w-full items-center rounded-[var(--radius-md)] px-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

const chipDefault = `${chipBase} text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]`;
const chipSelected = `${chipBase} bg-[var(--color-accent-muted)] font-medium text-[var(--color-accent)]`;

/**
 * Status + category + tag filters (URL-driven).
 * Desktop: rail chips; mobile: native GET form selects (design S1).
 */
export function ArticleFilters({
  status,
  categorySlug,
  tagSlug,
  categories,
  tags,
}: ArticleFiltersProps) {
  return (
    <>
      {/* Mobile / stacked selects via GET form (no client JS) */}
      <div className="mb-6 md:hidden">
        <form method="get" action="/" className="space-y-3">
          <div>
            <label
              htmlFor="mobile-status"
              className="mb-1 block text-sm font-medium text-[var(--color-text)]"
            >
              Status
            </label>
            <Select id="mobile-status" name="status" defaultValue={status}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Drafts</option>
              <option value="ALL">All</option>
            </Select>
          </div>

          <div>
            <label
              htmlFor="mobile-category"
              className="mb-1 block text-sm font-medium text-[var(--color-text)]"
            >
              Category
            </label>
            {categories.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No categories yet. Categories appear here once defined (seed or
                create).
              </p>
            ) : (
              <Select
                id="mobile-category"
                name="category"
                defaultValue={categorySlug ?? ""}
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div>
            <label
              htmlFor="mobile-tag"
              className="mb-1 block text-sm font-medium text-[var(--color-text)]"
            >
              Tag
            </label>
            {tags.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No tags available. Tags will appear when configured.
              </p>
            ) : (
              <Select id="mobile-tag" name="tag" defaultValue={tagSlug ?? ""}>
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Apply filters
          </button>
        </form>
      </div>

      {/* Desktop filter rail */}
      <nav
        aria-label="Filters"
        className="hidden w-[220px] shrink-0 space-y-6 md:block"
      >
        <div>
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Status
          </h2>
          <ul className="space-y-0.5">
            {(
              [
                { value: "PUBLISHED" as const, label: "Published" },
                { value: "DRAFT" as const, label: "Drafts" },
                { value: "ALL" as const, label: "All" },
              ] as const
            ).map((opt) => {
              const selected = status === opt.value;
              return (
                <li key={opt.value}>
                  <Link
                    href={buildFilterHref({
                      status: opt.value,
                      category: categorySlug,
                      tag: tagSlug,
                    })}
                    className={selected ? chipSelected : chipDefault}
                    aria-current={selected ? "page" : undefined}
                  >
                    {opt.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Categories
          </h2>
          {categories.length === 0 ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-[var(--color-text-secondary)]">
                No categories yet
              </p>
              <p className="text-[var(--color-text-muted)]">
                Categories appear here once defined (seed or create).
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              <li>
                <Link
                  href={buildFilterHref({
                    status,
                    category: null,
                    tag: tagSlug,
                  })}
                  className={!categorySlug ? chipSelected : chipDefault}
                  aria-current={!categorySlug ? "page" : undefined}
                >
                  All
                </Link>
              </li>
              {categories.map((cat) => {
                const selected = categorySlug === cat.slug;
                return (
                  <li key={cat.id}>
                    <Link
                      href={buildFilterHref({
                        status,
                        category: cat.slug,
                        tag: tagSlug,
                      })}
                      className={selected ? chipSelected : chipDefault}
                      aria-current={selected ? "page" : undefined}
                    >
                      {cat.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Tags
          </h2>
          {tags.length === 0 ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-[var(--color-text-secondary)]">
                No tags available
              </p>
              <p className="text-[var(--color-text-muted)]">
                Tags will appear when configured.
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              <li>
                <Link
                  href={buildFilterHref({
                    status,
                    category: categorySlug,
                    tag: null,
                  })}
                  className={!tagSlug ? chipSelected : chipDefault}
                  aria-current={!tagSlug ? "page" : undefined}
                >
                  All
                </Link>
              </li>
              {tags.map((tag) => {
                const selected = tagSlug === tag.slug;
                return (
                  <li key={tag.id}>
                    <Link
                      href={buildFilterHref({
                        status,
                        category: categorySlug,
                        tag: tag.slug,
                      })}
                      className={selected ? chipSelected : chipDefault}
                      aria-current={selected ? "page" : undefined}
                    >
                      {tag.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
    </>
  );
}
