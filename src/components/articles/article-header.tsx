import { Archive, Clock, MoreHorizontal, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { absoluteTime, relativeTime } from '@/lib/format';
import { readingTime } from '@/lib/markdown';
import type { ArticleDetail } from '@/types/domain';
import { StatusBadge } from './status-badge';

/** Title segment of the breadcrumb, truncated at 40 chars per design-spec.md §3.4. */
const BREADCRUMB_TITLE_LIMIT = 40;

function truncateTitle(title: string): string {
  return title.length > BREADCRUMB_TITLE_LIMIT
    ? `${title.slice(0, BREADCRUMB_TITLE_LIMIT - 1)}…`
    : title;
}

export type ArticleHeaderProps = {
  article: ArticleDetail;
  /** Omitted on the create route; iteration 6 wires the actions. */
  actions?: React.ReactNode;
};

/**
 * design-spec.md §3.4's detail header: breadcrumb, `h1`, meta line, status badge,
 * the archived banner, and the action row.
 *
 * Three details are deliberate rather than incidental:
 *
 * - The breadcrumb is a `nav[aria-label="Breadcrumb"]` wrapping an `<ol>`, with
 *   `aria-current="page"` on the last item (§9.3). The category segment is the
 *   only link besides `Home`; an uncategorized article renders it as plain text.
 * - `Edit` is the **only filled button on the page** (§3.4). The archive action
 *   sits in the `⋯` overflow menu because it is destructive and rare (UX10).
 * - The archived banner uses `--surface-muted` (not `--warning`) so an archived
 *   article reads as stale rather than alarming.
 */
export function ArticleHeader({ article, actions }: ArticleHeaderProps) {
  const minutes = readingTime(article.bodyMd);

  return (
    <header>
      <nav aria-label="Breadcrumb" className="text-ink-subtle text-[12px]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink text-ink-subtle no-underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {article.category ? (
            <li>
              <Link
                href={`/categories/${article.category.slug}`}
                className="hover:text-ink text-ink-subtle no-underline"
              >
                {article.category.name}
              </Link>
            </li>
          ) : (
            <li className="text-ink-subtle">Uncategorized</li>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" title={article.title} className="text-ink-muted truncate">
            {truncateTitle(article.title)}
          </li>
        </ol>
      </nav>

      <div className="mt-4 flex items-baseline gap-2">
        <h1 className="text-ink text-[32px] leading-[1.25] font-semibold tracking-[-0.02em]">
          {article.title}
        </h1>
        <StatusBadge status={article.status} />
      </div>

      <p className="text-ink-subtle mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
        <span>{article.category?.name ?? 'Uncategorized'}</span>
        <span aria-hidden="true">·</span>
        <span>
          Updated{' '}
          <time dateTime={article.updatedAt.toISOString()} title={absoluteTime(article.updatedAt)}>
            {relativeTime(article.updatedAt)}
          </time>
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {minutes} min read
        </span>
      </p>

      {article.status === 'archived' ? (
        <p className="rounded-card bg-surface-muted text-ink-muted mt-4 px-4 py-3 text-[13px]">
          This article is archived and may be out of date.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {actions ?? (
          <>
            <Button asChild variant="primary" size="md">
              <Link href={`/articles/${article.slug}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

/** The `Archive article` menu item, exported so iteration 6 can mount it in a real menu. */
export function ArchiveMenuItem() {
  return (
    <span className="text-danger inline-flex items-center gap-2">
      <Archive className="h-4 w-4" aria-hidden="true" />
      Archive article
    </span>
  );
}
