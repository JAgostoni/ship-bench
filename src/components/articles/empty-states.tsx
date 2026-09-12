import { FileText, FilterX, FolderOpen, FolderPlus, SearchX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NewCategoryDialog } from '@/components/layout/new-category-dialog';

/**
 * The five canonical empty states from design-spec.md §5.6. **Copy is exact.**
 *
 * Four come from `architecture.md` §6.5; the fifth ("filter combination yields
 * nothing") is the documented addition `design-spec.md` UX20 makes, because a
 * filter can produce an empty set while articles exist and reusing "No articles
 * yet" there would be factually wrong and would push users to create a duplicate
 * article.
 *
 * All five live here, and `ArticleList` selects one, so no list surface in the
 * app can render blank (design-spec.md §7.3).
 */

const ICON_CLASS = 'h-8 w-8';

/** 1 — No articles exist at all. */
export function NoArticlesState() {
  return (
    <EmptyState
      icon={<FileText className={ICON_CLASS} aria-hidden="true" />}
      title="No articles yet"
      description="Create the first article to start building your team's knowledge base."
      action={
        <Button asChild variant="primary" size="md">
          <Link href="/articles/new">New article</Link>
        </Button>
      }
    />
  );
}

/** 2 — A search returned nothing. */
export function NoResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX className={ICON_CLASS} aria-hidden="true" />}
      title={`No results for “${query}”`}
      description="Try a different term, or browse all articles."
      action={
        <Button asChild variant="primary" size="md">
          <Link href="/">Clear search</Link>
        </Button>
      }
    />
  );
}

/** 3 — A category has no articles. */
export function EmptyCategoryState({ category, slug }: { category: string; slug: string }) {
  return (
    <EmptyState
      icon={<FolderOpen className={ICON_CLASS} aria-hidden="true" />}
      title={`Nothing in ${category} yet`}
      description="Articles you assign to this category will appear here."
      action={
        <Button asChild variant="primary" size="md">
          <Link href={`/articles/new?category=${encodeURIComponent(slug)}`}>
            New article in {category}
          </Link>
        </Button>
      }
    />
  );
}

/**
 * 4 — No categories exist.
 *
 * **Placement matters** (design-spec.md §4.4): this state replaces the sidebar's
 * category *list*, not the article list. A database with no categories still has a
 * browse list, and showing "No categories yet" there would tell a reader the wrong
 * thing — the browse surface renders state 1 instead.
 *
 * The CTA is the dialog's own trigger, so the state's action and the sidebar's
 * persistent `New category` button open the same component rather than two
 * lookalikes.
 */
export function NoCategoriesState({ className }: { className?: string } = {}) {
  return (
    <EmptyState
      className={className}
      icon={<FolderPlus className={ICON_CLASS} aria-hidden="true" />}
      title="No categories yet"
      description="Categories help you group related articles."
      action={
        <NewCategoryDialog
          trigger={
            <Button variant="primary" size="md">
              Create a category
            </Button>
          }
        />
      }
    />
  );
}

/** 5 — A filter combination yields nothing while articles exist. */
export function NoFilterMatchState() {
  return (
    <EmptyState
      icon={<FilterX className={ICON_CLASS} aria-hidden="true" />}
      title="No articles match these filters."
      description="Try removing a filter."
      action={
        <Button asChild variant="primary" size="md">
          <Link href="/">Clear filters</Link>
        </Button>
      }
    />
  );
}

export type EmptyStateContext = {
  /** Articles matching the current view; `0` means an empty state is needed. */
  count: number;
  /** Non-empty in search mode. */
  query?: string;
  /** The active category filter, when the list is category-scoped. */
  category?: { name: string; slug: string } | null;
  /** True when any filter (`category`/`status`/`sort`) differs from the default. */
  hasFilters?: boolean;
};

/**
 * Picks the correct state for an empty **article** list.
 *
 * Order matters: a search with a query is a search result even inside a category,
 * and a filtered-empty list must never be reported as "no articles yet"
 * (design-spec.md UX20).
 *
 * State 4 ("No categories yet") is deliberately absent — it belongs to the
 * sidebar's category list and is rendered by `Sidebar`, because a database with no
 * categories still has a perfectly good article list.
 */
export function ListEmptyState({ query, category, hasFilters }: EmptyStateContext) {
  if (query) return <NoResultsState query={query} />;
  if (category) return <EmptyCategoryState category={category.name} slug={category.slug} />;
  if (hasFilters) return <NoFilterMatchState />;
  return <NoArticlesState />;
}
