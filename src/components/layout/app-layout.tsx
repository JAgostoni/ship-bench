import { AppShell } from '@/components/layout/app-shell';
import { FocusOnNavigate } from '@/components/layout/focus-on-navigate';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { articleRepository } from '@/server/repositories/articles';
import { categoryRepository } from '@/server/repositories/categories';

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
  await Promise.resolve();

  const sidebar = <Sidebar categories={categories} uncategorizedCount={uncategorizedCount} />;

  return (
    <AppShell header={<Header appName={appName} navigation={sidebar} />} sidebar={sidebar}>
      <FocusOnNavigate />
      {children}
    </AppShell>
  );
}
