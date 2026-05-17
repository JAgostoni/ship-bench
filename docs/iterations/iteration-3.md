# Iteration 3 — Application Shell + Browse / List View

## Goal

Build the persistent application shell (root layout, sidebar navigation, CSS design tokens) and the primary `/articles` page (article list, search, and category filtering). After this iteration a developer can browse all articles, filter by category, and search — the core read flow for primary users is functional end-to-end.

## Scope

- CSS design tokens (custom properties) in `globals.css`
- Inter font via `next/font/google`
- Root layout (`src/app/layout.tsx`) with Nav sidebar
- Root redirect (`src/app/page.tsx` → `/articles`)
- `Nav` server component (sidebar with category list and New Article button)
- `SearchBar` client component (debounced, updates `?q=` URL param)
- `ArticleCard` server component
- `CategoryBadge` component
- `StatusBadge` component
- `EmptyState` component
- Article list page (`src/app/articles/page.tsx`) — browse + search + category filter

---

## Task List

### 3.1 — Add CSS design tokens to `globals.css`

Replace the current `globals.css` contents with the full design token block from the design spec (§8.1). The file should contain:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@layer base {
  :root {
    --color-bg:               #f8f9fa;
    --color-surface:          #ffffff;
    --color-surface-raised:   #f1f5f9;
    --color-border:           #e2e8f0;
    --color-border-strong:    #cbd5e1;
    --color-text-primary:     #0f172a;
    --color-text-secondary:   #475569;
    --color-text-muted:       #94a3b8;
    --color-accent:           #2563eb;
    --color-accent-hover:     #1d4ed8;
    --color-accent-subtle:    #eff6ff;
    --color-accent-text:      #1e40af;
    --color-draft-bg:         #fefce8;
    --color-draft-text:       #854d0e;
    --color-draft-border:     #fde68a;
    --color-error:            #dc2626;
    --color-error-bg:         #fef2f2;
    --color-error-border:     #fecaca;
    --color-success:          #16a34a;
    --color-success-bg:       #f0fdf4;
    --sidebar-width:          240px;
    --sidebar-width-collapsed: 64px;
    --nav-height-mobile:      48px;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-text-primary);
    font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  }
}
```

### 3.2 — Implement root layout with Inter font and shell structure

Implement `src/app/layout.tsx`:

- Import `Inter` from `next/font/google` with `subsets: ['latin']` and `variable: '--font-inter'`
- Apply `${inter.variable} font-sans` to `<body>`
- Use the two-column shell described in the design spec (§8.4):
  - `<body>` — `flex h-screen overflow-hidden bg-[--color-bg]`
  - `<Nav />` — server component, 240px sidebar
  - `<main>` — `flex-1 overflow-y-auto`
  - Inside `<main>`: `<div className="p-4 lg:p-6">` wrapping `{children}`
- Set `<html lang="en">`
- Include the `globals.css` import

The `<Nav>` component is async (calls `listCategories()`) — the layout must handle this correctly within the RSC model (it is itself a Server Component that renders Nav as a child).

### 3.3 — Implement root redirect

Replace the placeholder `src/app/page.tsx` with a redirect to `/articles`:

```ts
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/articles');
}
```

### 3.4 — Implement the `Nav` sidebar component

Create `src/app/components/Nav.tsx` as a Server Component (no `'use client'` directive). This component:

**Renders (top to bottom):**
1. App name "Knowledge Base" — `<h1>` (or `<p>` if `<h1>` is reserved for page content — see heading hierarchy in design spec §7), 16px semibold, 24px top padding, left-aligned
2. `<SearchBar />` — client component imported here, full width
3. Section label "CATEGORIES" — 11px uppercase, `tracking-widest`, `text-[--color-text-muted]`, 20px top margin
4. `<nav aria-label="Categories">` wrapping the category list
5. Category list — "All Articles" link first (href `/articles`), then one link per category (href `/articles?category=[slug]`), each as styled nav links (see design spec §8.3 sidebar category link pattern). Active state is determined by comparing the current `?category=` search param (read via `useSearchParams` in a client wrapper, or by passing active category as a prop from the page)
6. `<hr className="border-[--color-border]" />`
7. "New Article" button — full-width primary button linking to `/articles/new`

**Active state for category links:**
The sidebar is a Server Component and cannot use `useSearchParams`. Use one of two approaches:
- Wrap the category list in a thin Client Component (`CategoryNav`) that reads `useSearchParams()` and marks the active link via `aria-current="page"`. The parent `Nav` remains a Server Component that calls `listCategories()` and passes the result as a prop to `CategoryNav`.
- Or, pass the active category slug down from the page's `searchParams` prop through the layout (not possible with App Router layouts — layouts do not receive search params).

The `CategoryNav` client wrapper is the correct approach. It receives `categories: CategoryDTO[]` as a prop, calls `useSearchParams()` for the active slug, and renders the list.

**Styling for nav links:** use the pattern from design spec §8.3. Apply `aria-[current=page]` CSS selectors rather than a custom `active` class.

### 3.5 — Implement `SearchBar` client component

Create `src/components/SearchBar.tsx` with `'use client'` directive:

- `<input type="search">` with `placeholder="Search articles…"` and `id="search-input"`
- `<label htmlFor="search-input" className="sr-only">Search articles</label>`
- On mount, initialize value from `useSearchParams().get('q') ?? ''`
- 300ms debounce on `onChange` — call `router.push('?q=[value]', { scroll: false })` when debounce fires
- If input is empty, call `router.push('/articles', { scroll: false })` to clear the `?q=` param entirely
- `Enter` keydown: fire immediately (cancel pending debounce, push to router)
- `Escape` keydown: clear the input value and push `/articles` (or remove `?q=`)
- Show a `×` clear button (Lucide `X` icon, 16×16) inside the input on the right when value is non-empty. Clicking it clears value and resets the URL.
- Styling: height 36px, 1px border `--color-border`, radius 6px, left padding 8px, Search icon (Lucide `Search`, 16×16) as prefix with 8px gap, focus ring 2px `--color-accent`

Implement the debounce with `useRef` + `setTimeout`/`clearTimeout` (no external debounce library needed).

### 3.6 — Implement `CategoryBadge` component

Create `src/components/CategoryBadge.tsx` as specified in the design spec (§8.5):

- Props: `{ name: string; colorIndex: number }`
- Render a `<span>` with inline `style` for backgroundColor, color, and borderColor from the 6-color palette
- CSS classes: `inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border`
- The component is a Server Component (no client interactivity needed)

### 3.7 — Implement `StatusBadge` component

Create `src/components/StatusBadge.tsx`:

- Props: `{ status: ArticleStatus }`
- If `status === 'PUBLISHED'`: return `null` (no badge shown for published)
- If `status === 'DRAFT'`: render a pill badge:
  - `<span>` with classes for `--color-draft-bg` background, `--color-draft-text` text, `--color-draft-border` border
  - Content: `<span className="sr-only">Status: </span>DRAFT` (screen reader announces "Status: Draft")
  - Same pill shape as CategoryBadge

### 3.8 — Implement `EmptyState` component

Create `src/components/EmptyState.tsx`:

- Props: `{ variant: 'empty' | 'no-results' | 'no-category'; query?: string; category?: string }`
- Container: `role="status"`, `min-h-[320px]`, `flex flex-col items-center justify-center`, centered
- Icon (48×48, `--color-text-muted`):
  - `'empty'` → Lucide `FileText`
  - `'no-results'` → Lucide `SearchX`
  - `'no-category'` → Lucide `FolderOpen`
- Heading and body copy per the three variants in design spec (§2.6)
- CTAs per variant:
  - `'empty'` → `<a href="/articles/new">` primary button "+ New Article"
  - `'no-results'` → `<a href="/articles">` text link "Clear search" + `<a href="/articles">` text link "Browse all"
  - `'no-category'` → `<a href="/articles">` text link "Browse all articles"

All `<a>` tags use Next.js `<Link>` internally.

### 3.9 — Implement `ArticleCard` component

Create `src/components/ArticleCard.tsx` as a Server Component:

- Props: `ArticleListItem` (from `src/types/index.ts`)
- The entire card is wrapped in a `<Link href={/articles/${slug}}>` (or use a `<a>` with positioning trick per design spec)
- Layout:
  - Top row: `<CategoryBadge>` (if category present) + article title + spacer + `<StatusBadge>` (if draft)
  - Middle: excerpt (14px, `--color-text-secondary`, `-webkit-line-clamp: 2`)
  - Bottom-right: updated date formatted as `MMM D` (current year) or `MMM D, YYYY` (prior years)
- Hover state: background `--color-accent-subtle`, border `--color-accent`
- Focus-visible ring on the link
- Use `new Intl.DateTimeFormat` for date formatting; do not use a date library

### 3.10 — Implement the article list page

Implement `src/app/articles/page.tsx` as an async Server Component:

- Props: `{ searchParams: { q?: string; category?: string } }` (Next.js 16 App Router passes search params as a prop)
- If `q` is present: call `searchArticles(q, { categorySlug: category })`
- Otherwise: call `listArticles({ categorySlug: category })` — defaults to PUBLISHED only
- Page heading row (flexbox, space-between):
  - Left: `<h1>` — "Articles" (normal) or `Results for "${q}"` (when searching)
  - Left (muted): article count — e.g., "12 articles"
  - If searching: `<a href="/articles" className="text-sm text-[--color-accent]">× Clear search</a>`
  - Right: `<Link href="/articles/new">` primary button "+ New Article"
- Article list: `<ul>` with `<li>` wrapping each `<ArticleCard>`
- If the list is empty: render `<EmptyState variant="no-results" query={q} />` (if searching) or `<EmptyState variant="no-category" category={category} />` (if filtering) or `<EmptyState variant="empty" />` (no articles at all)
- `<hr>` divider between heading row and article list

### 3.11 — Verify the browse flow

With the dev server running and the database seeded:

1. Navigate to `http://localhost:3000` — confirm redirect to `/articles`
2. Confirm all seeded published articles appear in the list (draft article should not appear)
3. Confirm category badges display with correct colors
4. Click a category in the sidebar — confirm the list filters correctly
5. Type in the search bar — confirm the URL updates to `?q=...` and results filter after 300ms
6. Press `Escape` in the search bar — confirm the search clears
7. Search for a term with no results — confirm the EmptyState renders
8. Click "× Clear search" — confirm full article list is restored

---

## Iteration Notes

- The `Nav` component calls `listCategories()` on every request since it is inside the root layout (a Server Component). Next.js App Router caches Prisma queries per-request by default — no additional caching setup is needed for v1.
- `CategoryNav` (the client wrapper for active state detection) must be wrapped in `<Suspense>` if it calls `useSearchParams()` — Next.js requires this when the parent is a Server Component. The suspense fallback can be a static category list with no active state.
- The article count shown in the heading reflects the current filtered/searched set, not the total article count in the database.
- The `?category=` filter and `?q=` filter compose: a user can have both active simultaneously. The server component reads both params and passes both to the service layer.
- Do not use the `prose` class on the list page — excerpt is plain text, not Markdown. The `prose` class is used only on the detail page (iteration 4).
