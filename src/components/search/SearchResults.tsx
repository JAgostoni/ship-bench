import Link from "next/link";
import type { SearchResultItem } from "@/lib/fts";

type SearchResultsProps = {
  query: string;
  results: SearchResultItem[];
};

/**
 * Full search results list — design S2.
 * Snippets may contain sanitized `<mark>` tags only.
 */
export function SearchResults({ query, results }: SearchResultsProps) {
  const count = results.length;
  const countLabel =
    count === 1 ? "1 article" : `${count} articles`;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold leading-tight text-[var(--color-text)]">
          Results for “{query}”
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{countLabel}</p>
      </header>

      <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        {results.map((hit) => (
          <li key={hit.id}>
            <Link
              href={`/articles/${hit.slug}`}
              className="block px-4 py-3 transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus-ring)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-[var(--color-text)]">
                  {hit.title}
                </h2>
                {hit.category ? (
                  <span className="shrink-0 rounded-[var(--radius-full)] bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                    {hit.category.name}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                    Uncategorized
                  </span>
                )}
              </div>
              {hit.snippet ? (
                <p
                  className="search-snippet mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]"
                  dangerouslySetInnerHTML={{ __html: hit.snippet }}
                />
              ) : hit.excerpt ? (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                  {hit.excerpt}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
