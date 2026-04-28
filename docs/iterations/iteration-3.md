# Iteration 3: Frontend Shell, Routing, and Read-Only Pages

**Goal:** Build the complete frontend application shell, all read-only pages, and global UI components. The app should be navigable, responsive, and visually match the design spec. Search should work end-to-end against the real API.

**Deliverable:** A user can browse the article list, search, click into an article detail page, and navigate back. All responsive breakpoints (mobile, tablet, desktop) render correctly.

---

## Task List

### 3.1 Set up React Router v7 SPA
- File: `src/main.tsx`
  - Render `<RouterProvider>` with a `createBrowserRouter`.
- File: `src/App.tsx`
  - Define routes:
    - `/` → `Home`
    - `/articles/:slug` → `ArticleDetail`
    - `/articles/new` → placeholder "Create article" (full implementation in Iteration 4)
    - `/articles/:slug/edit` → placeholder "Edit article"
  - Wrap all routes in `AppShell`.

### 3.2 Build API client
- File: `src/lib/api.ts`
  - `API_BASE` from `import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"`.
  - Generic `api<T>(path, options?)` that:
    - Sets `Content-Type: application/json`.
    - Parses JSON envelope.
    - Throws `ApiError` on `!res.ok` using `json.error`.
  - Named helpers: `getArticles(search?)`, `getArticle(slug)`, `searchArticles(query)`, `getCategories()`, etc.

### 3.3 Build global layout components
- **AppShell** (`src/components/AppShell.tsx`)
  - Renders `Header`, `Sidebar` (desktop) / drawer (tablet/mobile), and `<main>`.
  - Handles responsive breakpoints: persistent sidebar ≥1024px, drawer 768–1023px, hidden <768px.
  - Drawer: slide-in from left, overlay backdrop, close on overlay click or `Escape`, focus trap while open.
- **Header** (`src/components/Header.tsx`)
  - Fixed 56px bar, `z-50`.
  - Left: hamburger menu icon (drawer toggle on tablet/mobile) + "Knowledge Base" text logo.
  - Center: `SearchInput` (max-width 480px).
  - Right: "New Article" button (desktop) / plus icon (mobile), links to `/articles/new`.
- **Sidebar** (`src/components/Sidebar.tsx`)
  - 240px column, background `slate-50`, border-right.
  - Nav links: "All Articles" (`/`), "Categories" (disabled/v2 placeholder).
  - Active state uses `blue-600` accent.

### 3.4 Build shared UI components
- **SearchInput** (`src/components/SearchInput.tsx`)
  - Controlled input with 300 ms debounce (use `setTimeout` or a debounce hook).
  - Emits `onSearch(query)` to parent.
  - Loading spinner (`Loader2`) when a search request is in flight.
  - Clear button (`X`) appears when query is non-empty.
  - `Escape` clears search and removes focus.
  - `Enter` submits immediately (skips debounce).
- **EmptyState** (`src/components/EmptyState.tsx`)
  - Props: `icon`, `title`, `description`, `action` (optional React node).
  - Centered layout with icon 48px, `text-slate-400`.
  - Used for: no articles, no search results, 404 article not found.
- **Toast** (`src/components/Toast.tsx`)
  - Props: `variant` (success/error/info), `message`, `duration` (default 3000 ms), `onDismiss`.
  - Position: fixed top-center under header, `z-60`.
  - Auto-dismiss with `setTimeout`; animate slide-in/out.
  - Respect `prefers-reduced-motion`.
- **Skeleton** (`src/components/Skeleton.tsx`)
  - Props: `className` for dimensions.
  - `bg-slate-200 animate-pulse rounded`.
  - Respect `prefers-reduced-motion` (static low-contrast block).
- **ConfirmModal** (`src/components/ConfirmModal.tsx`)
  - Props: `title`, `description`, `confirmLabel`, `confirmVariant`, `onConfirm`, `onCancel`, `isOpen`.
  - Focus trap (`Tab` cycles inside modal), `Escape` closes, focus returns to trigger on close.
  - Backdrop overlay with `rgba(0,0,0,0.2)`.

### 3.5 Build Home page (`src/routes/Home.tsx`)
- Fetch articles on mount via `getArticles()`.
- If URL contains `?q=`, fetch via `searchArticles(query)` instead and reflect that in `SearchInput`.
- Display results summary (e.g., "24 articles" or "12 results for 'query'") in `text-sm text-slate-600`.
- Render `ArticleList` with fetched data.
- Handle states: loading (skeleton rows), empty (no articles), empty search (no results), error (inline banner with retry).
- Update `window.history` / React Router `useSearchParams` when search changes so URL is shareable.

### 3.6 Build ArticleList and ArticleCard
- **ArticleList** (`src/components/ArticleList.tsx`)
  - Renders a vertical stack (`space-3` gap) of `ArticleCard`.
  - If no items, renders `EmptyState`.
- **ArticleCard** (`src/components/ArticleCard.tsx`)
  - Full-width card: `rounded-lg border border-slate-200 bg-white p-5 shadow-sm`.
  - Entire card is a link to `/articles/:slug`.
  - Title: `text-lg font-medium text-slate-900`, underline on hover with `blue-600`.
  - Excerpt: 2-line clamp, `text-sm text-slate-600`.
  - Metadata row: clock icon + relative timestamp, category chip (if assigned), `#tags`.
  - Hover: `bg-slate-50 border-slate-300`.
  - Focus ring for keyboard navigation.

### 3.7 Build ArticleDetail page (`src/routes/ArticleDetail.tsx`)
- Loader: fetch article by slug via `getArticle(slug)`.
- Handle `not found`: render `EmptyState` with "Article not found" and "Back to articles" link.
- Breadcrumb: "Articles" (link to `/`) → current title (plain text).
- Action bar (top-right on desktop, sticky bottom bar on mobile):
  - "Edit" button (secondary style) → `/articles/:slug/edit`.
  - "Delete" button (text-only danger, `Trash2` icon) → opens `ConfirmModal`.
- Title: `text-3xl font-extrabold text-slate-900`.
- Metadata line: `text-sm text-slate-600` with formatted date, category, tags.
- Content: rendered via `react-markdown` + `remark-gfm` inside `prose max-w-[65ch]`.
  - Code blocks: `bg-slate-50 border rounded-md p-4`.
  - Inline code: `bg-slate-100 rounded-sm px-1 font-mono`.
- "Back to articles" link at bottom.

### 3.8 Wire delete flow on ArticleDetail
- On confirm in `ConfirmModal`, call `DELETE /api/articles/:slug` via `api()`.
- On success: show success `Toast` ("Article deleted."), navigate to `/`.
- On error: show error `Toast` with message from API envelope.

### 3.9 Responsive and accessibility spot-check
- Verify desktop (≥1024px): sidebar visible, search in header, action bar inline.
- Verify tablet (768–1023px): hamburger opens drawer, search in header.
- Verify mobile (<768px): hamburger + icon-only new-article button, search sticky below header, detail page has sticky bottom action bar.
- Keyboard: tab order matches design spec §7.2.
- Screen reader: landmarks (`<header>`, `<main>`, `<nav>`, `<article>`, `<h1>`/`<h2>`), live region for search results.
- Reduced motion: toasts and skeletons respect `prefers-reduced-motion`.

### 3.10 Iteration health check
- Run `npm run dev`; manually browse list, click article, search, delete.
- Run `npm run test:unit:run` — ensure no regressions in service tests.
- Commit the iteration.

---

## Iteration-Specific Notes
- **Placeholder editor routes:** `/articles/new` and `/articles/:slug/edit` can render a minimal "Coming in next iteration" page or a bare form shell. Do **not** implement the full editor here; that is Iteration 4's scope.
- **Search URL sync:** When the user clears the search input, remove `?q` from the URL entirely so the address bar stays clean.
- **Relative timestamps:** Use a lightweight utility (e.g., `Intl.RelativeTimeFormat` or a small custom helper) rather than adding a date library dependency.
- **Markdown rendering security:** `react-markdown` does not render raw HTML by default, satisfying the XSS prevention requirement from the architecture spec.
- **Category chips on cards:** The schema supports categories, but if an article has no category, do not render an empty chip.
