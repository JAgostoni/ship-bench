import Link from "next/link";
import type { ArticleListItem as ArticleListItemData } from "@/lib/queries/articles";
import { formatRelativeUpdated } from "@/lib/utils/dates";
import { StatusBadge } from "@/components/articles/StatusBadge";

type ArticleListItemProps = {
  article: ArticleListItemData;
};

/**
 * Compact list row — full-row link to detail (design S1 / §6.4).
 */
export function ArticleListItem({ article }: ArticleListItemProps) {
  const categoryLabel = article.category?.name ?? "Uncategorized";
  const tagNames = article.tags.map((t) => t.tag.name);
  const visibleTags = tagNames.slice(0, 3);
  const extraTagCount = tagNames.length - visibleTags.length;

  const tagsLabel =
    visibleTags.length === 0
      ? null
      : extraTagCount > 0
        ? `${visibleTags.join(", ")} +${extraTagCount}`
        : visibleTags.join(", ");

  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0">
      <Link
        href={`/articles/${article.slug}`}
        className="block px-4 py-3 transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus-ring)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-[var(--color-text)]">
            {article.title}
          </h2>
          <StatusBadge status={article.status} />
        </div>
        {article.excerpt ? (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
            {article.excerpt}
          </p>
        ) : null}
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          <span
            className={
              article.category
                ? undefined
                : "text-[var(--color-text-muted)]"
            }
          >
            {categoryLabel}
          </span>
          {tagsLabel ? (
            <>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
              <span>{tagsLabel}</span>
            </>
          ) : null}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <time dateTime={article.updatedAt.toISOString()}>
            {formatRelativeUpdated(article.updatedAt)}
          </time>
        </p>
      </Link>
    </li>
  );
}
