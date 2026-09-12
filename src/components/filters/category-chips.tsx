'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useNavigationTransition } from '@/components/layout/progress-bar';
import type { CategorySummary } from '@/types/domain';

export type CategoryChipsProps = {
  /** Every category, ordered as the sidebar orders them. */
  categories: Pick<CategorySummary, 'name' | 'slug' | 'articleCount'>[];
  /** The active category slug. Absent means the `All` chip is current. */
  activeSlug?: string;
  className?: string;
};

/**
 * The horizontally scrollable category chips (design-spec.md §5.9, §6.2; iteration
 * 5 task 5.3).
 *
 * **They navigate to `/categories/[slug]`, per design-spec.md §4.4** — a category
 * is a location, not a query-string refinement. The `<button>`s drive
 * `router.push` through the shell's shared transition so the header progress bar
 * lights during the change (§2.1's "only global loading indicator"). They are
 * buttons rather than `<Link>`s for exactly that reason: the transition wrapper is
 * what makes the pending state observable, and a `<Link>` performs its own push
 * that the wrapper cannot see. The tradeoff — losing middle-click "open in new
 * tab" — is acceptable for a refinement control that is duplicated as a real link
 * in the sidebar.
 *
 * An active `q` is carried across, so "search inside this category" stays a
 * single mental model (§4.2) by round-tripping as `/categories/[slug]?q=…`.
 */
export function CategoryChips({ categories, activeSlug, className }: CategoryChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { run } = useNavigationTransition();

  const q = searchParams.get('q');
  const suffix = q ? `?q=${encodeURIComponent(q)}` : '';

  const go = (href: string) => {
    run(() => {
      router.push(href, { scroll: false });
    });
  };

  return (
    <div
      className={cn(
        'flex min-w-0 [scrollbar-width:none] items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <Chip active={activeSlug === undefined} onClick={() => go(`/${suffix}`)}>
        All
      </Chip>
      {categories.map((category) => (
        <Chip
          key={category.slug}
          active={activeSlug === category.slug}
          onClick={() => {
            go(`/categories/${category.slug}${suffix}`);
          }}
        >
          {category.name}
          <span className="text-ink-subtle ml-1.5 text-[12px] tabular-nums">
            <span className="sr-only">{category.articleCount} articles</span>
            <span aria-hidden="true">{category.articleCount}</span>
          </span>
        </Chip>
      ))}
    </div>
  );
}

/** 32px visual height with the `kb-touch` expansion to the 44px touch floor (§6.4). */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'kb-touch rounded-control relative flex h-8 shrink-0 items-center px-2.5 text-[13px]',
        active
          ? 'bg-accent-soft text-accent-ink font-medium'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
