import Link from "next/link";
import { Snippet } from "@/components/Snippet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchXIcon } from "@/components/ui/icons";
import { SEARCH_LIMIT_DEFAULT, searchArticles } from "@/lib/repo/articles";
import { formatDateTime, formatRelativeTime } from "@/lib/time";

// Content freshness beats caching for an internal KB (architecture §6.1).
export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

/**
 * S3 — full search results (design §1.3/S3, §2.2B). Server-rendered and
 * shareable; calls the repo directly (no HTTP hop). The header SearchBox
 * pre-fills from the same `q` param.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : (params.q ?? "");
  const q = raw.trim();

  // Blank/missing q is an instruction state, never an error (design §2.2B).
  if (q === "") {
    return (
      <>
        <PageHeader title="Search" titleSize="xl" />
        <p className="text-base text-text-secondary">
          Type in the search box above to search all articles.
        </p>
      </>
    );
  }

  const { results, total } = searchArticles(q, SEARCH_LIMIT_DEFAULT);

  return (
    <>
      <PageHeader
        title={`Search results for “${q}”`}
        titleSize="xl"
        rightSlot={
          // The count node is the aria-live announcement target (design §7.4).
          <span aria-live="polite">
            <Badge>
              {total} result{total === 1 ? "" : "s"}
              <span className="sr-only"> for {q}</span>
            </Badge>
          </span>
        }
      />
      {results.length === 0 ? (
        <EmptyState
          icon={<SearchXIcon size={32} />}
          title={`No results for “${q}”`}
          body="Check the spelling or try a broader term."
          action={
            <Button href="/" variant="secondary">
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {results.map((result) => (
            <li key={result.id}>
              {/* Entire row is one link; inset focus ring (design §4.5). */}
              <Link
                href={`/articles/${result.id}`}
                className="group block py-3 hover:bg-bg focus-visible:-outline-offset-2"
              >
                <span className="block text-md font-medium text-accent group-hover:underline">
                  {result.title}
                </span>
                <span className="mt-1 block text-base text-text-secondary">
                  <Snippet text={result.snippet} />
                </span>
                <span className="mt-1 block text-sm text-text-secondary">
                  Updated{" "}
                  <time
                    dateTime={new Date(result.updatedAt).toISOString()}
                    title={formatDateTime(result.updatedAt)}
                  >
                    {formatRelativeTime(result.updatedAt)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
