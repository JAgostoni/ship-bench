# Iteration 2 — Browse & Detail

## Goal

Build the core read experience end-to-end: article listing with pagination, article detail view with prose rendering, empty states, and the category sidebar. By the end, a user can open the app, browse articles, click into one, and read it.

---

## Tasks

### 2.1 Article List Page (Home Route)

Build the home page (`app/(public)/page.tsx`) that displays a paginated list of articles using a Server Component.

**Steps:**
1. Create `src/lib/articles.ts` with article service functions:
   - `getArticles(opts: { limit?: number, cursor?: string, category?: string })`: fetches published articles ordered by `updated_at` DESC. Use cursor-based pagination with `created_at`. Returns `{ articles, nextCursor }`
   - `getArticleById(id: string)`: fetches a single published article by ID
2. Create `app/(public)/page.tsx` as a Server Component:
   - Call `getArticles({ limit: 20 })` to load the first page
   - Render the `<ArticleList />` component with the articles
   - Handle three states: `ready` (articles), `empty` (no articles → show EmptyState), `error` (catch and show error state with retry)
3. **ArticleList** — `components/article/ArticleList.tsx`:
   - Renders a list of `ArticleCard` components
   - Accepts props: `articles[]`, `state: 'loading' | 'empty' | 'error' | 'ready'`, `onArticleClick`
   - Loading state: renders 5 `SkeletonCard` components
   - Empty state: renders `<EmptyState icon="📄" title="No articles yet" description="Create your first article to get started." actionLabel="Create article" />`
4. **ArticleCard** — `components/article/ArticleCard.tsx`:
   - Props: `article` object (id, title, content excerpt, category, updatedAt), `variant: 'default' | 'selected'`, `onClick`
   - Layout: Title (16px semibold) → Preview (first ~200 chars of content, muted, truncated to 2 lines) → Meta row (category name · relative timestamp like "2h ago", 12px muted)
   - Card states: default, hover (background fill + slight shadow), focus-visible (2px accent border), active/selected (left accent border + active background) — per design spec Section 5.2
   - Clickable — renders as an `<a>` or `<button>` with proper keyboard accessibility

### 2.2 Pagination / Load More

Add cursor-based pagination to the article list using a "Load more" button.

**Steps:**
1. Update `getArticles` to accept `cursor` parameter — filters to articles created before the cursor timestamp
2. Add pagination state to the home page Server Component:
   - If the API returns `nextCursor`, render a "Load more" button at the bottom of the list
   - The button triggers a server action or client-side fetch to append the next page of articles
3. "Load more" button uses the Button component (tertiary variant, medium size)
4. After loading more, append new articles to the existing list (client-side state or partial re-render)

### 2.3 Article Detail View

Build the individual article reading page at `app/(public)/articles/[id]/page.tsx`.

**Steps:**
1. Create `app/(public)/articles/[id]/page.tsx` as a Server Component:
   - Fetch article by ID using `getArticleById(id)`
   - Handle 404: if article not found, render `<EmptyState title="This article no longer exists" actionLabel="Back to articles" onAction={() => navigate('/')} />`
   - If found, render the `<ArticleDetail />` component
2. **ArticleDetail** — `components/article/ArticleDetail.tsx`:
   - Props: `article` object, `onBack`, `onEdit`
   - Layout (reading-focused, single-column, max-width `72ch`, centered):
     - "← Back" link above title (returns to browse view, `preserve scroll`)
     - Article title: 24px bold (use `--text-2xl`)
     - Meta row: category · "Updated X ago" (using `date-fns` `formatRelative`)
     - Divider line
     - Content: rendered with `kb-prose` class (see below)
     - "Edit" button at the bottom (tertiary) — links to `/articles/[id]/edit` (placeholder for Iteration 4)
3. **Prose styles** — add `.kb-prose` class to `app/global.css`:
   - Apply typography styles from design spec Section 1.3:
   - `h1` (24px bold), `h2` (20px semibold, margin-top 32px), `h3` (16px semibold, margin-top 24px)
   - `p` (16px, line-height 1.75, margin-bottom 16px)
   - `code` (inline): 13px monospace, bg `--color-surface-elevated`, rounded 4px, padding 2px 6px
   - `pre > code`: full-width block, bg `--color-surface-elevated`, rounded 8px, padding 16px, 14px mono, overflow-x auto
   - `ul/ol`: padding-left 24px, line-height 1.75
   - `blockquote`: left border 3px solid `--color-border-accent`, italic, muted
   - `table`: full width, alternating rows, bold header
   - `a`: accent color, underline on hover
   - `hr`: `--color-border` line, margin 32px 0
4. Install `date-fns` for relative time formatting: `npm install date-fns`

### 2.4 Sidebar with Category List

Build the category sidebar displayed on the browse view.

**Steps:**
1. **Sidebar** — `components/layout/Sidebar.tsx`:
   - Props: `categories[]` (with article count), `activeCategory?`, `onSelect`
   - 240px fixed width on desktop (≥1024px)
   - "Categories" heading (12px uppercase, tracking 0.05em, muted)
   - "All" item always first, shows total article count
   - Category items: name + article count badge; selected item highlighted with `--color-accent` bg
   - On tablet (<1024px): hidden; accessible via hamburger toggle
   - On mobile (<768px): hidden; slide-out drawer (defer full implementation — just hide)
2. **SidebarDrawer** — `components/layout/SidebarDrawer.tsx`:
   - Mobile/tablet overlay version with semi-transparent backdrop
   - Triggered by hamburger button in header
   - For v1: simple hide/show toggle; full slide-out animation can be refined post-MVP
3. Integrate sidebar into the Browse page layout:
   - Two-column layout: sidebar (240px) + article list (flex: 1, max ~800px)
   - Sidebar on the left, article list filling the rest

### 2.5 Responsive Layout & UX Polish

Ensure the browse and detail views work across desktop and tablet breakpoints.

**Steps:**
1. Desktop (≥1024px): full sidebar visible + article list centered
2. Tablet (768–1023px): sidebar hidden behind hamburger toggle
3. Mobile (<768px): single column, sidebar hidden, article cards full-width with 16px padding
4. Navigation: verify "← Back" link on detail view preserves browse scroll position (use client-side navigation or store scroll position in `sessionStorage`)
5. Empty state styling: verify all empty states match design spec (icon, title, description, CTA)

---

## Iteration Notes

- **Dependency**: Requires Iteration 1 (project, DB, seed data, UI components, design tokens).
- Article content at this stage is stored as raw HTML strings (from the seed data). Markdown rendering is handled in Iteration 4 when the editor produces Markdown → HTML. For now, the seed script can provide basic HTML (headings, paragraphs, lists) that renders correctly through `dangerouslySetInnerHTML` wrapped in the `.kb-prose` class.
- Category filtering is NOT implemented yet. The sidebar renders categories but does not filter the article list. Clicking a category is a no-op that can be connected in the post-MVP iteration.
- All articles returned are `published` only. The status column exists but there is no draft/published distinction in this iteration.
