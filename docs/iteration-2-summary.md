# Iteration 2 Summary: Layout, Browsing & Detail

**Date:** 2026-05-09
**Status:** Complete

---

## What Was Built

### Task 2.1: Base UI Components
- **`src/components/ui/button.tsx`**: Reusable Button with 4 variants (primary, secondary, danger, ghost), 3 sizes (sm, md, lg), loading spinner, focus ring, disabled states. Uses `forwardRef` for native button attributes.
- **`src/components/ui/input.tsx`**: Form input with label, error state (red border + error text), hint text, `aria-describedby` linking, auto-generated IDs via `useId`.
- **`src/components/ui/badge.tsx`**: Badge with 3 variants (neutral for categories, warning for drafts, success for published).
- **`src/components/ui/empty-state.tsx`**: Empty state placeholder with icon, title, description, and optional action button.

### Task 2.2: Layout Shell
- **`src/components/layout/header.tsx`**: Sticky header (mobile: 56px, desktop: 64px) with BookOpen logo, "Knowledge Base" title, search slot, "New Article" button. Mobile: hamburger menu toggle, compact `+` icon for new article.
- **`src/components/layout/sidebar.tsx`**: Desktop persistent sidebar (260px) + mobile slide-out drawer (280px). "All Articles" link + alphabetically sorted categories with article counts. Active state with blue left border. Backdrop overlay on mobile, closes on Escape key, escape-hatch for `prefers-reduced-motion`.
- **`src/components/layout/footer.tsx`**: 48px footer with "Knowledge Base · Internal Tool" centered text.
- **`src/components/layout/app-shell.tsx`**: Client component wiring header, sidebar, footer together. Manages drawer open/close state. Extracts `activeSlug` from URL via `usePathname`.
- **`src/app/layout.tsx`**: Root layout fetches categories from Prisma, passes them to AppShell. Includes skip-to-content link, metadata template (`%s — Knowledge Base`).

### Task 2.3: Pagination
- **`src/components/ui/pagination.tsx`**: Previous/Next links with page info, preserves existing query params, mobile simplified view (no page numbers). Disabled at boundaries.

### Task 2.4: ArticleCard & ArticleList
- **`src/components/articles/article-card.tsx`**: Horizontal card with title link, excerpt (2-line clamp), category badge, draft badge, relative timestamp via `relativeTime()` helper.
- **`src/components/articles/article-list.tsx`**: Three states — populated (maps articles to cards), loading (5 skeleton cards), empty (EmptyState component).

### Task 2.5: Home Page
- **`src/app/page.tsx`**: Server Component fetching published articles (descending by `updatedAt`), 20 per page via Prisma. Renders ArticleList + Pagination. Empty state with "No articles yet" when no published articles.

### Task 2.6: Article Detail Page
- **`src/app/articles/[slug]/page.tsx`**: Server Component with `generateMetadata`. Fetches article + category via Prisma, calls `notFound()` if missing. Renders: back/edit navigation, draft info strip (amber banner), title, metadata bar (category badge, draft badge, full date), Markdown content via `react-markdown` with `remark-gfm`, custom external link handling (`target="_blank"`).

### Task 2.7: Not-Found & Error Pages
- **`src/app/not-found.tsx`**: Global 404 using EmptyState.
- **`src/app/articles/[slug]/not-found.tsx`**: Article-scoped 404.
- **`src/app/error.tsx`**: Client error boundary with "Try again" button and error logging.

### Supporting Utilities
- **`src/lib/utils.ts`**: `relativeTime()` (just now / minutes / hours / days / full date) and `fullDate()` helpers.

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **AppShell as client component** | Sidebar drawer state (`menuOpen`) requires client-side interactivity. Root layout remains a Server Component that fetches categories and passes them to AppShell. |
| 2 | **`activeSlug` derived from URL** | Using `usePathname()` in AppShell avoids needing a React context or prop drilling. The sidebar auto-highlights based on the current route. |
| 3 | **Home page fetches only published articles** | Per design spec: draft articles are only visible via direct URL. Home page filters `where: { status: 'published' }`. |
| 4 | **Article detail shows all articles regardless of status** | Draft articles are visible via direct URL (for author preview), consistent with the design spec. The amber info strip warns that the article is a draft. |
| 5 | **Skeleton loading in ArticleList** | 5 skeleton cards with `animate-pulse` provide a smooth loading experience. Loading state is passed as prop (used when search results are pending in I3). |
| 6 | **Prisma queries in Server Components only** | Read pages call Prisma directly (no API round-trip). This follows the architecture spec pattern. |

---

## Issues Encountered

1. **`react-markdown` `components` type**: The `a` component callback had `children` as required, but `react-markdown` passes it as optional. Fixed by changing to `children?: React.ReactNode`.
2. **Directory creation**: `src/app/articles/[slug]/` didn't exist. Created via PowerShell before file creation.

---

## Verification Results

| Check | Status |
|-------|--------|
| `npm run build` compiles successfully | ✅ |
| `npm run lint` passes with 0 errors, 0 warnings | ✅ |
| `npx tsc --noEmit` passes | ✅ |
| `/` (home) shows 3 published articles | ✅ |
| `/articles/getting-started-with-the-knowledge-base` renders Markdown | ✅ |
| `/articles/code-review-guidelines` shows draft badge + info strip | ✅ |
| `/articles/nonexistent-slug` returns 404 | ✅ |
| `/nonexistent-route` returns 404 | ✅ |
| Sidebar shows categories with article counts | ✅ |
| Mobile hamburger button present (`lg:hidden`) | ✅ |
| Skip-to-content link present in HTML | ✅ |
| Focus-visible rings on interactive elements | ✅ |
| Pagination component built (not visible with 3 articles) | ✅ |
