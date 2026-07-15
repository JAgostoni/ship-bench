import Link from "next/link";
import { FileText, SearchX } from "lucide-react";
import { searchArticles, type SearchResultItem } from "@/lib/fts";
import { EmptyState } from "@/components/articles/EmptyState";
import { SearchResults } from "@/components/search/SearchResults";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function firstParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw || undefined;
}

/**
 * Full search results — design S2 / architecture §5.3.
 * SSR via searchArticles (shareable URLs work without JS for results).
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = (firstParam(params.q) ?? "").trim();

  if (!q) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <EmptyState
          icon={FileText}
          title="Search the knowledge base"
          description="Enter a term to find articles by title or content."
          action={{
            node: (
              <a
                href="#header-search"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                Focus search
              </a>
            ),
          }}
        />
      </div>
    );
  }

  let results: SearchResultItem[] = [];
  let searchError: string | null = null;
  try {
    const data = await searchArticles({ query: q, limit: 20 });
    results = data.results;
  } catch (err) {
    console.error("[search/page] searchArticles failed:", err);
    searchError = "Search failed. Try again.";
    results = [];
  }

  if (searchError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <EmptyState
          icon={SearchX}
          title="Search failed"
          description={searchError}
          action={{ label: "Back to articles", href: "/" }}
        />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <EmptyState
          icon={SearchX}
          title={`No results for “${q}”`}
          description="Try different keywords. Only published articles are searched."
          action={{ label: "Clear search", href: "/" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <p className="mb-4">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          ← All articles
        </Link>
      </p>
      <SearchResults query={q} results={results} />
    </div>
  );
}
