import { Footer } from './footer';
import { NavigationProgressProvider } from './progress-bar';

/**
 * The three-region shell from design-spec.md §2.1.
 *
 * Deliberately **no global `max-w-screen-2xl` wrapper**: the three regions are the
 * constraint, and centering the sidebar away from the left edge would break the
 * "library shelf" feel the spec asks for.
 *
 * The sidebar is `sticky`, not `fixed`, so it participates in the grid and
 * disappears naturally below 1024px without a second layout. `main` is the only
 * scroll container that matters; the sidebar scrolls independently and nothing is
 * nested inside `main`.
 *
 * Landmarks: exactly one `<header>`, one `<main id="main">`, one `<footer>`
 * (`design-spec.md` §9.4). The sidebar's `<nav>` is labelled `Main` per
 * `docs/iterations/iteration-4.md` task 4.2's shell contract.
 *
 * `NavigationProgressProvider` wraps the whole shell so the header's `ProgressBar`
 * and the filter/pager transitions that drive it share one `useTransition`
 * (design-spec.md §2.1's single global indicator).
 */
export function AppShell({
  header,
  sidebar,
  children,
}: {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <NavigationProgressProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="bg-surface border-border sticky top-0 z-30 border-b">{header}</header>

        <div className="mx-auto flex w-full flex-1">
          <aside className="border-border sticky top-(--layout-header-h) hidden h-[calc(100dvh-var(--layout-header-h))] w-(--layout-sidebar-w) shrink-0 overflow-y-auto border-r lg:block">
            <nav aria-label="Main">{sidebar}</nav>
          </aside>
          {/*
            The shell owns the single `<main>` landmark. Routes render their content
            into it rather than each declaring their own: `page.tsx`, `loading.tsx`,
            `error.tsx`, and `not-found.tsx` all render inside this element, and if
            each supplied a `<main>` the segment swap between the loading fallback and
            the page would briefly put two `#main` landmarks in the document
            (design-spec.md §9.4 requires exactly one).
          */}
          <main id="main" tabIndex={-1} className="min-w-0 flex-1">
            {children}
          </main>
        </div>

        <Footer />
      </div>
    </NavigationProgressProvider>
  );
}
