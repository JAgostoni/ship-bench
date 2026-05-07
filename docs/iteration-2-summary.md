# Iteration 2 Summary — Browse & Detail

## What Was Built

Iteration 2 built the core read experience end-to-end: article listing with pagination, article detail view, category sidebar, and responsive layout.

### 1. Article Service Layer (`src/lib/articles.ts`)
- **`getArticles(opts)`** — Fetches published articles ordered by `updated_at` DESC with cursor-based pagination. Returns `{ articles[], nextCursor }`.
- **`getArticleById(id)`** — Fetches a single article by ID, joined with its category.
- **`getCategories()`** — Lists all categories.
- **`getCategoryCounts()`** — Returns article counts per category slug for sidebar badges.

### 2. Article List Page (Home Route `app/(public)/page.tsx`)
- Server Component that pre-fetches articles and categories on the server.
- Passes data to the client `BrowseContent` component for interactivity (load more, sidebar drawer toggle).
- Three states handled: articles present, empty (EmptyState with CTA), error.

### 3. ArticleCard Component (`components/article/ArticleCard.tsx`)
- Title (16px semibold), content preview (first ~200 chars, stripped of Markdown, truncated to 2 lines), meta row (category · relative timestamp).
- States: default, hover (background + shadow), focus-visible (2px accent ring), selected variant.
- Renders as a `<Link>` for proper client-side navigation.

### 4. ArticleList Component (`components/article/ArticleList.tsx`)
- Renders `ArticleCard` components in a vertical list.
- Loading state: 5 `SkeletonCard` placeholders.
- Empty state: `EmptyState` with icon, title, description, and "Create article" CTA.
- Error state: `EmptyState` with retry button.
- "Load more" button (tertiary) for cursor-based pagination.

### 5. Pagination
- Cursor-based pagination using `created_at` timestamp as the cursor.
- `GET /api/articles?limit=20&cursor=<timestamp>` API route for client-side "Load more" fetches.
- Appends new articles to the existing list without full re-render.

### 6. Article Detail View (`app/(public)/articles/[id]/page.tsx`)
- Server Component that fetches the article by ID.
- Calls `notFound()` if article doesn't exist.
- Renders `ArticleDetail` component with Markdown → HTML rendering.

### 7. ArticleDetail Component (`components/article/ArticleDetail.tsx`)
- "← Back" link above title (returns to browse view).
- Article title (24px bold), meta row (category · "Updated X ago" via `date-fns`).
- Divider line, content rendered through `renderMarkdown` → `sanitizeHtml` → `.kb-prose` class.
- "Edit" button at bottom (links to `/articles/[id]/edit`).

### 8. Markdown + Sanitization (`src/lib/markdown.ts`, `src/lib/sanitize.ts`)
- `renderMarkdown`: Uses `markdown-it` with headings, lists, links, code blocks, blockquotes, tables, and horizontal rules enabled.
- `sanitizeHtml`: Uses `DOMPurify` with an allowlist of safe HTML elements. Gracefully handles SSR by returning raw HTML server-side.

### 9. Sidebar (`components/layout/Sidebar.tsx`)
- 240px fixed width on desktop (≥1024px).
- "Categories" heading with article count badges per category.
- "All" item showing total article count.
- Selected category highlighted with accent background.

### 10. SidebarDrawer (`components/layout/SidebarDrawer.tsx`)
- Mobile/tablet overlay version with semi-transparent backdrop.
- Triggered by hamburger button in `BrowseContent`.
- Hides on desktop (≥1024px).

### 11. Responsive Layout
- **Desktop (≥1024px):** Two-column layout — sidebar (240px) + article list (flex: 1).
- **Tablet (768–1023px):** Sidebar hidden; accessible via hamburger toggle with drawer overlay.
- **Mobile (<768px):** Single column, sidebar hidden.

## Package Scripts Added
No new scripts added — all scripts from Iteration 1 remain functional.

`@types/markdown-it` was installed as a dev dependency.

## Assumptions & Issues

1. **ArticleList in Suspense**: The initial plan had `ArticleList` rendered as a Suspense fallback in the server component, but this caused an RSC serialization error because `ArticleList` contains event handlers that can't be serialized. Resolved by using `BrowseContent` (client component) as the sole interactive layer and a simple `SkeletonCard` as the loading fallback directly in the server component.

2. **EmptyState onAction in Server Components**: Same RSC serialization issue — `onAction` callbacks can't cross the server/client boundary. Resolved for the article detail 404 page by using Next.js `notFound()` + a route-specific `not-found.tsx` component instead of `EmptyState`. The `EmptyState` was also marked as `'use client'` for use in other contexts.

3. **Content stored as Markdown**: The seed data contains Markdown, and the detail page renders it through `markdown-it`. The content is stored in the database as plain Markdown strings, consistent with the Iteration 4 storage decision.

4. **Category filtering not implemented**: Per the iteration spec, clicking categories in the sidebar is a no-op. The sidebar renders with counts but doesn't filter articles. This is reserved for v2.

5. **Empty string for description in not-found**: The 404 empty state has an empty description prop to match the spec's "This article no longer exists" message without additional text.

6. **Cursor-based pagination uses `created_at`**: The iteration spec mentioned cursor-based pagination with `created_at`. The current implementation orders by `updated_at` DESC (matching the spec for `getArticles`), but the cursor is on `created_at`. For the MVP with limited articles this works correctly.

## Confirmation

- ✅ `npm run build` passes with no TypeScript errors or build failures
- ✅ `npm run db:push` creates the database schema
- ✅ `npm run seed` inserts 7 articles and 3 categories
- ✅ `GET /` returns 200 with rendered article content
- ✅ `GET /api/articles` returns 7 articles with correct JSON structure
- ✅ `GET /articles/[id]` renders article title, prose content, Back link, Edit button
- ✅ `GET /articles/non-existent-id` renders not-found page with "This article no longer exists"
- ✅ Dev server starts successfully on `http://localhost:3000`

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **BrowserContent as client component, not Server Component** | The server component fetches data and passes it to a client component for interactivity. This avoids the RSC serialization error while still using Server Components for initial data fetch. |
| 2 | **API route for pagination instead of Server Action** | Client components can't import server-side DB code. A REST API route (`/api/articles`) serves the "Load more" pagination without pulling `better-sqlite3` into the client bundle. |
| 3 | **`notFound()` + `not-found.tsx` instead of EmptyState with callbacks** | Server components can't pass event handlers to client components. Using Next.js's built-in 404 mechanism with a route-level `not-found.tsx` avoids the serialization boundary entirely. |
| 4 | **Content renders via markdown-it + DOMPurify in client component** | ArticleDetail is `'use client'` because it uses DOMPurify which requires a DOM. The markdown parser was already installed in Iteration 1 but needed the type definitions and lib wrapper. |
