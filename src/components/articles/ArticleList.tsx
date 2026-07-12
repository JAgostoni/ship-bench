import Link from "next/link";
import { FileText } from "lucide-react";
import type { ArticleListItem as ArticleListItemData } from "@/lib/queries/articles";
import { ArticleListItem } from "@/components/articles/ArticleListItem";
import { EmptyState } from "@/components/articles/EmptyState";

export type ListFilterState = {
  status: string;
  category?: string;
  tag?: string;
};

type ArticleListProps = {
  items: ArticleListItemData[];
  total: number;
  page: number;
  totalPages: number;
  /** True when any non-default filter is active (status drafts/all, category, tag). */
  hasActiveFilters: boolean;
  filters: ListFilterState;
};

function buildPageHref(filters: ListFilterState, page: number): string {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "PUBLISHED") {
    params.set("status", filters.status);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.tag) {
    params.set("tag", filters.tag);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

const pageControlClass =
  "inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/**
 * Article list + empty states + pagination (design S1 / §6.9–6.10).
 */
export function ArticleList({
  items,
  total,
  page,
  totalPages,
  hasActiveFilters,
  filters,
}: ArticleListProps) {
  if (items.length === 0) {
    // Out-of-range page still reports total > 0 from the query layer
    if (total > 0 || hasActiveFilters) {
      return (
        <EmptyState
          icon={FileText}
          title="No matching articles"
          description="Try another category, tag, or status."
          action={{ label: "Clear filters", href: "/" }}
        />
      );
    }
    return (
      <EmptyState
        icon={FileText}
        title="No articles yet"
        description="Create the first article to start the team knowledge base."
        action={{ label: "Create article", href: "/articles/new" }}
      />
    );
  }

  return (
    <div>
      <ul className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        {items.map((article) => (
          <ArticleListItem key={article.id} article={article} />
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav
          className="mt-6 flex items-center justify-center gap-3"
          aria-label="Pagination"
        >
          {page <= 1 ? (
            <span
              className={`${pageControlClass} cursor-not-allowed text-[var(--color-text-muted)] opacity-50`}
              aria-disabled="true"
            >
              Previous
            </span>
          ) : (
            <Link
              href={buildPageHref(filters, page - 1)}
              className={`${pageControlClass} text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]`}
              rel="prev"
            >
              Previous
            </Link>
          )}

          <span className="text-sm text-[var(--color-text-secondary)]">
            Page {page}
          </span>

          {page >= totalPages ? (
            <span
              className={`${pageControlClass} cursor-not-allowed text-[var(--color-text-muted)] opacity-50`}
              aria-disabled="true"
            >
              Next
            </span>
          ) : (
            <Link
              href={buildPageHref(filters, page + 1)}
              className={`${pageControlClass} text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]`}
              rel="next"
            >
              Next
            </Link>
          )}
        </nav>
      ) : null}

      <p className="sr-only">
        Showing {items.length} of {total} articles
      </p>
    </div>
  );
}
