import Link from 'next/link';
import { absoluteTime, relativeTime } from '@/lib/format';
import type { ArticleListItem } from '@/types/domain';
import { StatusBadge } from './status-badge';

export type ArticleCardProps = Pick<
  ArticleListItem,
  'title' | 'slug' | 'summary' | 'excerpt' | 'status' | 'category' | 'updatedAt'
> & {
  /**
   * Pre-rendered title / body line, used by search results so the row can carry
   * `<mark>` highlights (design-spec.md §3.3 rule 3). Omitted on browse, where the
   * plain `title`/`summary` strings render unchanged.
   *
   * This is what makes the search row *the same component* as the browse row
   * rather than a lookalike copy: the 72px height, the inset focus ring, and the
   * meta line exist in exactly one place.
   */
  titleNode?: React.ReactNode;
  summaryNode?: React.ReactNode;
};

/**
 * design-spec.md §5.3, whose markup this follows closely because every class in
 * it is load-bearing:
 *
 * - **The whole card is one `<a>`.** Nothing inside it is interactive, so the
 *   category name in the meta line is plain text here (it becomes a link only in
 *   the detail breadcrumb) — a nested link is invalid HTML and a screen-reader
 *   trap.
 * - **`min-height`, never `height`.** §9.4's text-spacing requirement
 *   (WCAG 1.4.12) breaks a fixed-height text container; the row is 72px with a
 *   2-line summary and grows if a reader increases line height.
 * - **Inset focus ring**, because the row is clipped by the list container's
 *   `overflow: hidden` for `rounded-card`.
 * - **Meta line is 12px `--ink-subtle`**, the one place §9.1 accepts 4.22:1, and
 *   only because the same information is duplicated on the detail page and the
 *   timestamp carries the absolute date in its `title`.
 */
export function ArticleCard({
  title,
  slug,
  summary,
  excerpt,
  status,
  category,
  updatedAt,
  titleNode,
  summaryNode,
}: ArticleCardProps) {
  return (
    <Link
      href={`/articles/${slug}`}
      className="group border-border hover:bg-surface-muted focus-visible:ring-ring focus-visible:bg-surface-muted flex min-h-[72px] items-start gap-4 rounded-none border-b px-4 py-3.5 no-underline focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-ink group-hover:text-accent-ink min-w-0 truncate text-[17px] leading-snug font-semibold">
            {titleNode ?? title}
          </h3>
          <StatusBadge status={status} />
        </div>
        <p className="text-ink-muted mt-1 line-clamp-2 text-[14px] leading-relaxed">
          {summaryNode ?? summary ?? excerpt}
        </p>
        <p className="text-ink-subtle mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] leading-[1.4]">
          <span>{category?.name ?? 'Uncategorized'}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={updatedAt.toISOString()} title={absoluteTime(updatedAt)}>
            {relativeTime(updatedAt)}
          </time>
        </p>
      </div>
    </Link>
  );
}
