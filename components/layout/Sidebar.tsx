'use client';

interface SidebarCategory {
  slug: string;
  name: string;
  count: number;
}

interface SidebarProps {
  categories: SidebarCategory[];
  activeCategory?: string;
  onSelect?: (slug: string) => void;
  totalArticles: number;
}

export function Sidebar({
  categories,
  activeCategory,
  onSelect,
  totalArticles,
}: SidebarProps) {
  return (
    <aside
      className="h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ width: '240px' }}
      aria-label="Categories"
    >
      <nav className="p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
          Categories
        </h2>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => onSelect?.('')}
              className={[
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                !activeCategory
                  ? 'bg-[var(--color-accent-subtle)] font-medium text-[var(--color-accent)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              ].join(' ')}
            >
              <span>All</span>
              <span className="text-xs text-[var(--color-text-muted)]">{totalArticles}</span>
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.slug}>
              <button
                onClick={() => onSelect?.(cat.slug)}
                className={[
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  activeCategory === cat.slug
                    ? 'bg-[var(--color-accent-subtle)] font-medium text-[var(--color-accent)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                ].join(' ')}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{cat.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
