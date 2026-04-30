# Iteration 3 Summary: Frontend Shell, Routing, and Read-Only Pages

## What Was Built

### React Router v7 SPA
- `src/main.tsx` — Mounts `<RouterProvider>` with `createBrowserRouter`.
- `src/App.tsx` — Defines routes:
  - `/` → Home (article list + search)
  - `/articles/:slug` → ArticleDetail
  - `/articles/new` → PlaceholderEditor (new)
  - `/articles/:slug/edit` → PlaceholderEditor (edit)
- All routes are wrapped in `<AppShell>`.

### API Client (`src/lib/api.ts`)
- Generic `api<T>()` that reads the `{ data, error }` envelope, throws `ApiError` on failure.
- Named helpers: `getArticles`, `getArticle`, `searchArticles`, `getCategories`, `createArticle`, `updateArticle`, `deleteArticle`.
- `API_BASE` sourced from `import.meta.env.VITE_API_BASE_URL` with fallback to `http://localhost:3001`.

### Global Layout Components
- **AppShell** (`src/components/AppShell.tsx`) — Persistent sidebar on `lg`, drawer on `md`/`sm`, focus-trap + `Escape` to close drawer, overlay backdrop click to close.
- **Header** (`src/components/Header.tsx`) — Fixed 56px bar with hamburger toggle, logo, `<SearchInput>`, and responsive "New Article" button.
- **Sidebar** (`src/components/Sidebar.tsx`) — "All Articles" active-state link, disabled "Categories" placeholder for v2.

### Shared UI Components
- **SearchInput** (`src/components/SearchInput.tsx`) — Debounced 300ms input, `Enter` submits immediately, `Escape` clears + blur, loading spinner during debounce, clear button, URL sync via `useSearchParams`.
- **EmptyState** (`src/components/EmptyState.tsx`) — Reusable centered empty state with icon, title, description, optional action.
- **Toast** (`src/components/Toast.tsx`) — Slide-in/out with `prefers-reduced-motion` support, auto-dismiss after 3s, success / error / info variants.
- **Skeleton** (`src/components/Skeleton.tsx`) — `animate-pulse` with `prefers-reduced-motion` fallback to static block.
- **ConfirmModal** (`src/components/ConfirmModal.tsx`) — Focus trap, `Escape` close, focus returns to trigger on dismiss, backdrop overlay, danger/primary confirm variants.

### Home Page (`src/routes/Home.tsx`)
- Fetches articles on mount; switches to `searchArticles` when URL contains `?q=`.
- Displays result counts, handles loading (skeleton), empty (EmptyState), search-empty (SearchX), and error (inline banner + retry).
- Live region for search result count updates.

### ArticleList & ArticleCard
- **ArticleList** (`src/components/ArticleList.tsx`) — Vertical stack list with `role="list"`.
- **ArticleCard** (`src/components/ArticleCard.tsx`) — Card with hover/focus states, title, 2-line excerpt, metadata (relative time, category chip, tags), full-card link.

### ArticleDetail (`src/routes/ArticleDetail.tsx`)
- Fetches article by slug, renders breadcrumb, title, metadata, markdown content via `react-markdown` + `remark-gfm` inside `prose prose-slate`.
- Action bar: Edit link + Delete button (desktop), sticky bottom bar concept deferred to mobile via responsive flex.
- Delete flow: ConfirmModal → `DELETE /api/articles/:slug` → success Toast → navigate to `/`.
- Not-found state rendered with EmptyState.
- Relative time via lightweight `Intl.RelativeTimeFormat` helper (`src/lib/time.ts`).

### Placeholder Editor
- `src/routes/PlaceholderEditor.tsx` — Minimal "Coming in next iteration" page for `/articles/new` and `/articles/:slug/edit`.

### Responsive & Accessibility
- Breakpoints verified: sidebar at `lg`, drawer `md` and below, mobile icon-only new-article button.
- Semantic landmarks: `<header>`, `<main>`, `<nav>`, `<article>`, `<h1>`/`<h2>`.
- Focus-visible rings on all interactive elements.
- Live regions for search result counts.
- `prefers-reduced-motion` respected in Toast and Skeleton.

### Tailwind v4 Theme & Prose
- `src/styles/index.css` — Custom theme tokens already configured.
- Added `@tailwindcss/typography` plugin and `prose-slate` class for article body styling.

## Assumptions & Issues Encountered

- **TypeScript `import.meta.env`**: TypeScript 6+ with `types: ["vite/client"]` resolves `import.meta.env` correctly; used an explicit cast for `API_BASE`.
- **Prisma types in tsconfig**: Adding `"server"` to `tsconfig.json` `include` surfaced pre-existing type errors in server routes (due to different `Request` types between Express and DOM libs). Reverted include to just `src`, `shared`, `e2e` since server code is run by `tsx`, not bundled by Vite / checked by the client-side TypeScript build.
- **Lucide-react icons**: Verified all used icons (`Clock`, `FileText`, `SearchX`, `Construction`, etc.) exist in `lucide-react` v1.12.0.
- **Tailwind typography plugin**: Tailwind v4 requires `@plugin` syntax in CSS rather than a JS config; `@tailwindcss/typography` installed and added via `@plugin`.

## Verification

- `npm run test:unit:run` ✅ (25 tests passed, no regressions)
- `npm run test:e2e` ✅ (3 placeholder tests passed)
- `npx tsc --noEmit` ✅ (0 errors)
- `npm run dev` ✅
  - Frontend loads at http://localhost:5173/ ✅
  - API serves articles at http://localhost:3001/api/articles ✅
  - Search returns FTS5 results at http://localhost:3001/api/search?q=onboarding ✅
  - Frontend routing for `/articles/:slug` works ✅
  - Delete API called from ConfirmModal works ✅

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| `useSearchParams` for search state | Keeps search shareable via URL (`?q=`), no separate global state needed. |
| Home fetches from `getArticles` or `searchArticles` based on URL | Avoids duplicating search state between component and URL. |
| `localStorage` autosave deferred to Iteration 4 | Out of scope for read-only pages; will be implemented in editor page. |
| Mobile sticky bottom action bar | Implemented via responsive flex layout rather than fixed positioning to avoid viewport issues. |
| `prose prose-slate` from `@tailwindcss/typography` | Design spec requires `max-width: 65ch` and styled headings/links; typography plugin gives this for free. |
| Focus returns to trigger on ConfirmModal close | Improves keyboard accessibility per design spec §7.2. |
| `@tailwindcss/typography` via `@plugin` in CSS | Tailwind v4 standard approach; no `tailwind.config.js` needed. |
