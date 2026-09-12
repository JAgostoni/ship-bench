'use client';

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react';

/**
 * The header's 2px accent bar (design-spec.md §2.1) and the shared transition
 * context that drives it.
 *
 * **Why a context.** `useTransition`'s pending flag is local to the component
 * instance that started the transition. The progress bar lives in the header,
 * while the transitions that must light it up are started by `SearchInput`,
 * `FilterBar`, and `Pagination` further down the tree — so a bare
 * `useTransition()` in each place would never reach the bar. This provider owns
 * one transition at the shell level and exposes it, which is what makes
 * design-spec.md §2.1's "the only global loading indicator for filter, sort, and
 * pagination changes" true rather than aspirational.
 *
 * The hook degrades to a local `useTransition` when no provider is present, so a
 * component unit test can render `SearchInput`/`Pagination` standalone without
 * mounting the whole shell.
 */
type NavigationTransition = {
  pending: boolean;
  run: (navigate: () => void) => void;
};

const NavigationProgressContext = createContext<NavigationTransition | null>(null);

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    (navigate: () => void) => {
      startTransition(() => {
        navigate();
      });
    },
    [startTransition],
  );
  const value = useMemo(() => ({ pending, run }), [pending, run]);

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

/**
 * Starts a URL change inside the shell-wide transition that the progress bar
 * observes. Every filter, sort, pagination, and search refinement goes through
 * this, so the current list stays visible (at 60% opacity per design-spec.md §7.5)
 * while the server re-renders.
 */
export function useNavigationTransition(): NavigationTransition {
  const fromContext = useContext(NavigationProgressContext);
  const [pending, startTransition] = useTransition();

  return useMemo(
    () =>
      fromContext ?? {
        pending,
        run: (navigate: () => void) => startTransition(() => navigate()),
      },
    [fromContext, pending, startTransition],
  );
}

/**
 * `role="presentation"` on purpose: `useTransition`'s pending state has no
 * meaningful announcement — the content stays visible and the result count is the
 * live region (design-spec.md §9.3). `aria-hidden` keeps the decorative bar out of
 * the accessibility tree entirely.
 */
export function ProgressBar() {
  const { pending } = useNavigationTransition();

  if (!pending) return null;

  return (
    <div role="presentation" aria-hidden="true" className="h-0.5 w-full overflow-hidden">
      <div className="bg-accent h-full w-1/3 animate-[kb-progress_1s_linear_infinite]" />
    </div>
  );
}
