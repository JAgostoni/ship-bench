import { AppShell } from '@/components/layout/app-shell';
import { FocusOnNavigate } from '@/components/layout/focus-on-navigate';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ArchiveToastFromQuery, ToastFromQuery } from '@/components/layout/toast-from-query';
import { articleRepository } from '@/server/repositories/articles';
import { categoryRepository } from '@/server/repositories/categories';
import { readDisplayNameCookie } from '@/server/display-name';

/**
 * The three-region shell shared by every browsing and reading route
 * (design-spec.md §2.1).
 *
 * The sidebar's data is read here rather than in each page, so the ≥1024px column
 * and the mobile drawer always agree and no page can forget to pass counts. The
 * editor shell (iteration 6) is a sibling route group, which is how
 * design-spec.md §2.2's "no sidebar, no TOC, no search" focused shell is produced
 * without a conditional.
 *
 * `FocusOnNavigate` is mounted here for the same reason: it must run on every
 * client-side navigation into the group and nowhere else, and a layout is the only
 * place that observes all of them.
 */
export async function AppLayout({ children }: { children: React.ReactNode }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Team Knowledge Base';

  // Both repository calls are synchronous SQLite reads; the `await` makes this an
  // async RSC so the shell participates in streaming.
  const categories = categoryRepository.listWithCounts();
  const uncategorizedCount = articleRepository.countUncategorized();
  // Read here rather than in the chip so the chip's first paint is already correct —
  // a `useEffect` read would flash `Anonymous editor` before correcting itself. The raw
  // value (not the `Anonymous editor` fallback) is what lets the chip show its warning
  // dot only when a name genuinely has not been set.
  const displayName = await readDisplayNameCookie();
  await Promise.resolve();

  const sidebar = (
    <Sidebar
      categories={categories}
      uncategorizedCount={uncategorizedCount}
      displayName={displayName}
    />
  );

  return (
    <AppShell header={<Header appName={appName} navigation={sidebar} />} sidebar={sidebar}>
      <FocusOnNavigate />
      {/*
        The success toast a Server Action asked for by redirecting to `?toast=…`
        (`architecture.md` §7.5). Mounted once, in the shell, so every route that can
        receive a redirect renders it without repeating the bridge. `ArchiveToastFromQuery`
        is the special case: it renders the archive confirmation with its 5-second `Undo`.
      */}
      <ToastFromQuery />
      <ArchiveToastFromQuery />
      {children}
    </AppShell>
  );
}
