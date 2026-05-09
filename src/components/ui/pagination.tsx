import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

function buildUrl(baseUrl: string, pageNum: number, searchParams?: Record<string, string>): string {
  const params = new URLSearchParams(searchParams);
  if (pageNum > 1) {
    params.set('page', String(pageNum));
  } else {
    params.delete('page');
  }
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function Pagination({ page, totalPages, baseUrl, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevUrl = buildUrl(baseUrl, page - 1, searchParams);
  const nextUrl = buildUrl(baseUrl, page + 1, searchParams);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between py-4">
      {/* Previous */}
      {isFirstPage ? (
        <span className="text-sm text-neutral-400 cursor-not-allowed hidden sm:inline">← Previous</span>
      ) : (
        <Link
          href={prevUrl}
          className="text-sm text-neutral-700 hover:text-neutral-900 font-medium transition-colors"
        >
          ← Previous
        </Link>
      )}
      {/* Mobile prev */}
      <span className="sm:hidden">
        {isFirstPage ? (
          <span className="text-sm text-neutral-400 cursor-not-allowed">← Prev</span>
        ) : (
          <Link
            href={prevUrl}
            className="text-sm text-neutral-700 hover:text-neutral-900 font-medium transition-colors"
          >
            ← Prev
          </Link>
        )}
      </span>

      {/* Page info (desktop) */}
      <span className="hidden sm:inline text-sm text-neutral-600 tabular-nums">
        Page {page} of {totalPages}
      </span>

      {/* Next */}
      {isLastPage ? (
        <span className="text-sm text-neutral-400 cursor-not-allowed">Next →</span>
      ) : (
        <Link
          href={nextUrl}
          className="text-sm text-neutral-700 hover:text-neutral-900 font-medium transition-colors"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
