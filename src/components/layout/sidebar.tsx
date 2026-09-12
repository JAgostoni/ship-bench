import { FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CategorySummary } from '@/types/domain';
import { NoCategoriesState } from '@/components/articles/empty-states';
import { NewCategoryDialog } from './new-category-dialog';
import { SidebarLink } from './sidebar-link';

export type SidebarProps = {
  categories: CategorySummary[];
  /** Published articles with `category_id IS NULL`; the row renders only when ≥ 1. */
  uncategorizedCount: number;
};

/**
 * The sidebar from design-spec.md §2.1 and §4.4.
 *
 * Rendered twice — once in the ≥1024px sticky column and once inside the mobile
 * drawer — from the same server node, so the two can never drift.
 *
 * The section label and the `All articles` row are always present. The category
 * list is replaced by the canonical "No categories yet" empty state when there
 * are none (design-spec.md §4.4's Empty row), because §7.3 forbids a blank list
 * surface.
 */
export function Sidebar({ categories, uncategorizedCount }: SidebarProps) {
  return (
    <div className="px-3 py-4">
      <p className="text-ink-subtle px-2 text-[11px] leading-[1.2] font-semibold tracking-[0.06em] uppercase">
        Categories
      </p>

      <ul className="mt-2 flex flex-col gap-0.5">
        <li>
          <SidebarLink href="/">All articles</SidebarLink>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <SidebarLink href={`/categories/${category.slug}`} count={category.articleCount}>
              {category.name}
            </SidebarLink>
          </li>
        ))}
        {uncategorizedCount >= 1 ? (
          <li>
            <SidebarLink href="/categories/uncategorized" count={uncategorizedCount}>
              Uncategorized
            </SidebarLink>
          </li>
        ) : null}
      </ul>

      {categories.length === 0 ? <NoCategoriesState className="py-6" /> : null}

      <div className="mt-2 px-0.5">
        <NewCategoryDialog
          trigger={
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              New category
            </Button>
          }
        />
      </div>
    </div>
  );
}
