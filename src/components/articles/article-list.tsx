import { cn } from '@/lib/cn';
import type { ArticleListItem } from '@/types/domain';
import { ArticleCard } from './article-card';
import { type EmptyStateContext, ListEmptyState } from './empty-states';

export type ArticleListProps = {
  items: ArticleListItem[];
  /** Selects the correct empty state when `items` is empty (design-spec.md §5.6). */
  emptyState?: EmptyStateContext;
  className?: string;
};

/**
 * The row list from design-spec.md §3.2 ("Rows, not floating cards").
 *
 * Rows live inside **one** `--border` container with `rounded-card` and no gaps,
 * sharing 1px separators. The last row's bottom border is dropped so the
 * container border is not doubled.
 *
 * **Never blank.** design-spec.md §7.3 forbids an empty list surface, so an empty
 * `items` array always resolves to one of the five canonical states rather than
 * rendering a bare container. The default context produces state 1
 * ("No articles yet"), which is the correct reading for a plain list.
 */
export function ArticleList({ items, emptyState, className }: ArticleListProps) {
  if (items.length === 0) {
    return <ListEmptyState {...(emptyState ?? { count: 0 })} />;
  }

  return (
    <div
      className={cn(
        'border-border rounded-card overflow-hidden border',
        '[&>*:last-child]:border-b-0',
        className,
      )}
    >
      {items.map((item) => (
        <ArticleCard
          key={item.id}
          title={item.title}
          slug={item.slug}
          summary={item.summary}
          excerpt={item.excerpt}
          status={item.status}
          category={item.category}
          updatedAt={item.updatedAt}
        />
      ))}
    </div>
  );
}
