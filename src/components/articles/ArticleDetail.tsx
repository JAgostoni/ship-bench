import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import type { ArticleListItem } from "@/lib/queries/articles";
import { formatAbsoluteUpdated } from "@/lib/utils/dates";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { StatusBadge } from "@/components/articles/StatusBadge";
import { Button } from "@/components/ui/Button";

type ArticleDetailProps = {
  article: ArticleListItem;
};

/**
 * Article detail view — design S3.
 * Delete is deferred to Iteration 3 (Server Actions).
 */
export function ArticleDetail({ article }: ArticleDetailProps) {
  const categoryLabel = article.category?.name ?? "Uncategorized";
  const tagNames = article.tags.map((t) => t.tag.name);
  const safeHtml = sanitizeHtml(article.contentHtml);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="mb-6 inline-flex h-10 items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All articles
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold leading-tight text-[var(--color-text)]">
            {article.title}
          </h1>
          <StatusBadge status={article.status} />
        </div>

        <p className="text-sm text-[var(--color-text-muted)]">
          <span>{categoryLabel}</span>
          {tagNames.length > 0 ? (
            <>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
              <span>{tagNames.join(", ")}</span>
            </>
          ) : null}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time dateTime={article.updatedAt.toISOString()}>
            {formatAbsoluteUpdated(article.updatedAt)}
          </time>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/articles/${article.slug}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <Pencil className="size-4" aria-hidden />
            Edit
          </Link>
          {/* Delete wired in Iteration 3 */}
          <Button
            type="button"
            variant="danger-ghost"
            disabled
            title="Delete will be available when editing ships"
            aria-label="Delete article (coming soon)"
          >
            Delete
          </Button>
        </div>
      </header>

      <hr className="my-6 border-[var(--color-border)]" />

      <div
        className="prose-article"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </article>
  );
}
