import { AppLayout } from '@/components/layout/app-layout';

/**
 * The `(shell)` route group layout (design-spec.md §2.1).
 *
 * The group is a directory that never appears in a URL; it exists so `/`,
 * `/articles/[slug]`, and the later `/search` and `/categories/[slug]` routes share
 * one shell while the editor routes stay focused.
 *
 * Route-level `loading.tsx` files inside this group own the skeleton states
 * (design-spec.md §7.5), so the layout itself has no fallback to duplicate.
 *
 * `force-dynamic` is required here, not a shortcut. `AppLayout` reads category
 * counts from SQLite, and the database handle is created by
 * `src/instrumentation.ts` at server boot. Without this, Next.js evaluates the
 * layout during `next build`'s static-prerender pass — where no server has booted
 * and no handle exists — and the build fails with "Database not initialized".
 *
 * It is also the honest description of these routes: every one reads request-time
 * state (`searchParams` on `/`, a path parameter on `/articles/[slug]`), and
 * `cacheComponents`/`'use cache'` is deliberately off in v1 (`architecture.md`
 * §8.9, D14), so none of them could be cached even if prerendered.
 */
export const dynamic = 'force-dynamic';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
