import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Iteration-3 stub for S3: renders the instruction state for any query so the
 * header search form has a real, styled target. Iteration 4 replaces this
 * with the full results page (FTS results, highlights, empty state).
 */
export default function SearchPage() {
  return (
    <>
      <PageHeader title="Search" titleSize="xl" />
      <p className="text-base text-text-secondary">
        Type in the search box above to search all articles.
      </p>
    </>
  );
}
