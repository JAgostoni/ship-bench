# Iteration 2: Layout, Browsing & Detail (MVP Feature 1)

**Goal:** Build the visual shell, base UI component library, and the article browsing + detail reading experience. After this iteration, users can browse published articles, click into detail views, and see rendered Markdown content.

**Scope:** MVP Feature 1 — article browsing and article detail pages.

---

## Task 2.1: Build Base UI Components

**Files:** `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/empty-state.tsx`

These components have no data dependencies and can be built and tested in isolation.

### Button (`button.tsx`)
- Props: `variant: 'primary' | 'secondary' | 'danger' | 'ghost'`, `size: 'sm' | 'md' | 'lg'`, `loading?: boolean`, `disabled?: boolean`, plus all native `<button>` HTML attributes
- Variant styles per design spec:
  - Primary: `bg-neutral-900 text-white hover:bg-neutral-800`
  - Secondary: `bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50`
  - Danger: `bg-white text-red-600 border border-red-300 hover:bg-red-50`
  - Ghost: `bg-transparent text-neutral-600 hover:bg-neutral-100`
- Sizes: sm (`h-8 px-3 text-sm`), md (`h-10 px-4 text-sm`), lg (`h-12 px-6 text-base`)
- Loading state: shows `Loader2` spinner from lucide-react before text, disables button
- Focus: `focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2`
- Use `clsx` for conditional class construction
- Export as default, but also export the Button component named

### Input (`input.tsx`)
- Props: `label: string`, `error?: string`, `hint?: string`, `id?: string`, plus all native `<input>` HTML attributes
- Renders a `<label>` (linked via `htmlFor`/`id`), the `<input>`, and error/hint text below
- Error state: input border turns `border-red-500`, error text in `text-red-600 text-sm`
- Focus: `focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20`
- Use `aria-describedby` pointing to error/hint element IDs when present
- Generate a unique ID if none provided (use `useId` or a simple counter)

### Badge (`badge.tsx`)
- Props: `variant: 'neutral' | 'warning' | 'success'`, `children: ReactNode`
- Neutral: `bg-neutral-100 text-neutral-700 border-neutral-200` (for categories)
- Warning: `bg-amber-100 text-amber-800 border-amber-200` (for draft status)
- Success: `bg-green-100 text-green-700 border-green-200` (for published status — rarely shown)
- Common: `text-xs font-medium px-2.5 py-0.5 rounded-full border`

### EmptyState (`empty-state.tsx`)
- Props: `icon: LucideIcon`, `title: string`, `description: string`, `action?: { label: string, href: string }`
- Centered flex column layout with generous padding (`py-16`)
- Icon: 48px, `text-neutral-300`
- Title: `text-lg font-semibold text-neutral-900`
- Description: `text-sm text-neutral-500 mt-2`
- Action: rendered as a primary Button link below description if provided

**What to verify:** Each component renders correctly in isolation. Button variants and sizes all work. Input shows errors. Badge variants render distinct colors. EmptyState renders with and without action.

---

## Task 2.2: Build Layout Shell

**Files:** `src/components/layout/header.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/footer.tsx`, `src/app/layout.tsx`

### Root Layout (`layout.tsx`)
- HTML structure with `<html lang="en">`, proper `<head>` metadata (title: "Knowledge Base", description)
- Body: system font via `font-sans` class
- Skip-to-content link: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` — visually hidden, appears on focus, positioned at top-left
- Structure: Header → div (flex) → Sidebar + `<main id="main-content">` → {children} → Footer
- Import `globals.css`

### Header (`header.tsx`)
- Sticky (`sticky top-0 z-[var(--z-header)]`), 64px height (`h-16`), white bg with `shadow-sm`
- Layout: flex row, items-center, justify-between, px-6
- Left: App title/logo using `BookOpen` icon + "Knowledge Base" text, link to `/`
- Center: Reserved slot for SearchBar component (render `children` or a placeholder slot)
- Right: "New Article" button (primary, sm/md, links to `/articles/new`) — rendered as a `<Link>`
- Mobile (<768px): height 56px (`h-14`), New Article becomes `+` icon button (`aria-label="New article"`), search icon button on right
- Mobile hamburger: `Menu` icon button on left (before title), `aria-label="Open menu"`, triggers sidebar drawer state

### Sidebar (`sidebar.tsx`)
- Props: `categories: Category[]`, `activeSlug?: string`
- Desktop (≥1024px): persistent sidebar, 260px wide (`w-[260px]`), `border-r border-neutral-200`, `h-[calc(100vh-var(--header-height))]` sticky top at header height, overflow-y-auto
- Content:
  - "All Articles" link at top: bold when no activeSlug, `py-2 px-3 rounded-md`
  - Category list below: each item shows name + article count badge, sorted alphabetically
  - Active category: `bg-neutral-100 font-semibold border-l-2 border-blue-600`
  - Hover: `bg-neutral-50`
  - Count badge: `text-xs text-neutral-400 ml-auto`
- Mobile/Tablet (<1024px): slide-out drawer
  - Triggered by hamburger button in header — manage state via prop or context
  - Drawer: 280px wide, `bg-white shadow-lg`, slides from left (200ms ease-in-out)
  - Backdrop: `bg-black/30`, closes drawer on click
  - Close button (✕) in drawer header, `aria-label="Close menu"`
  - Close on Escape key
  - Respect `prefers-reduced-motion`: instant open/close
- "All Articles" links to `/`, category items link to `/categories/[slug]`

### Footer (`footer.tsx`)
- 48px height (`h-12`), `border-t border-neutral-200`, `bg-white`
- Centered text: "Knowledge Base · Internal Tool", `text-sm text-neutral-400`
- Not sticky; scrolls with content

**What to verify:**
- Layout renders with header, sidebar, main area, and footer
- Sidebar shows categories (hardcoded for now — will wire to data in Task 2.4)
- Mobile hamburger opens/closes drawer
- Skip-to-content link is focusable and navigates to main
- Header is sticky on scroll

---

## Task 2.3: Build Pagination Component

**File:** `src/components/ui/pagination.tsx`

- Props: `page: number`, `totalPages: number`, `baseUrl: string`
- Renders a `<nav aria-label="Pagination">` with:
  - "← Previous" button: links to `{baseUrl}?page={page-1}`, disabled (span with muted text) when page ≤ 1
  - Center text: "Page {page} of {totalPages}", `text-sm text-neutral-600 tabular-nums`
  - "Next →" button: links to `{baseUrl}?page={page+1}`, disabled when page ≥ totalPages
- Preserve existing query params (e.g., `?q=search&page=2`) — accept the full searchParams or construct URLs carefully
- Mobile (<768px): simplified to "← Prev" and "Next →" only, no page numbers
- Use Next.js `<Link>` components for navigation

**What to verify:** Pagination renders correctly for page 1 of 1, page 1 of 3, page 2 of 3, page 3 of 3. Previous/Next disabled at boundaries. Mobile view shows simplified layout.

---

## Task 2.4: Build ArticleCard & ArticleList Components

**Files:** `src/components/articles/article-card.tsx`, `src/components/articles/article-list.tsx`

### ArticleCard (`article-card.tsx`)
- Props: `article` object with `{ title, slug, excerpt, category, status, updatedAt }`
- Full-width horizontal card, `border-b border-neutral-200 py-4 px-1`
- Hover: `hover:bg-neutral-50` transition
- Layout (desktop): flex row, justify-between
  - Left: title (link to `/articles/[slug]`, `text-lg font-semibold text-blue-700 hover:text-blue-900 hover:underline`), excerpt below (`text-sm text-neutral-500 line-clamp-2`)
  - Right: category badge (Badge neutral variant, top), relative timestamp below (`text-xs text-neutral-400`)
- Layout (mobile): stack vertically — title full width, excerpt full width, then category + timestamp on one row
- Relative timestamp: use `Intl.RelativeTimeFormat` or a simple helper function — "2 hours ago", "3 days ago", "May 3, 2026" for >30 days
- Draft articles (if shown): show Draft badge (Badge warning variant) next to category badge
- Focus: visible ring on title link

### ArticleList (`article-list.tsx`)
- Props: `articles: Article[]`, `loading?: boolean`, `emptyStateProps?: {...}`
- **Loading state:** render 5 skeleton cards — `animate-pulse bg-neutral-200 rounded` placeholders for title (w-2/3), excerpt (w-full, 2 lines), badge (w-16)
- **Empty state:** render EmptyState component with the provided `emptyStateProps`
- **Populated state:** map articles to ArticleCard components
- **Error state:** handled by parent page's error boundary

**What to verify:** Cards render with mock data. Skeleton loading appears. Empty state with "No articles yet" renders. Article title link navigates correctly. Relative timestamps are human-readable.

---

## Task 2.5: Build Home Page (Article List)

**File:** `src/app/page.tsx`

Server Component. Implementation:

- Read `searchParams` (Promise in Next.js 16): `page` (default "1"), `q` (optional search query)
- For MVP (no search yet): fetch published articles ordered by `updatedAt DESC` via Prisma, paginated (20 per page)
- Calculate `totalPages` from total count
- Compute excerpt if not stored (but seed data includes it)
- Render:
  - Page heading area (optional for home — the article cards ARE the primary content)
  - ArticleList with articles
  - Pagination at bottom (and top if totalPages > 3)
- If no articles: render EmptyState with `FileText` icon, "No articles yet", "Create your first article to get started.", action → `/articles/new`
- Search integration will be added in Iteration 3 — for now, the search bar in the header is present but not yet wired

**What to verify:**
- Visiting `/` shows all published articles (3 from seed data)
- Draft article ("Code Review Guidelines") is NOT shown
- Articles are ordered by most recently updated
- Pagination works (though with 3 articles, only 1 page)
- Empty state renders if database has no published articles

---

## Task 2.6: Build Article Detail Page

**File:** `src/app/articles/[slug]/page.tsx`

Server Component. Implementation:

- Accept `params: Promise<{ slug: string }>` (Next.js 16 async params)
- Fetch article by slug via Prisma: include `category` relation
- If not found: call `notFound()` (renders closest `not-found.tsx`)
- Render:
  - Navigation row: "← Back to articles" link (Ghost button or text link) on left, "Edit" button (Secondary variant, links to `/articles/[slug]/edit`) on right
  - Article title as `<h1>`: `text-3xl font-bold text-neutral-900`
  - Metadata bar below title: `flex items-center gap-2 text-sm text-neutral-500`
    - Category badge (if article has category)
    - Draft badge (if `status === "draft"`: Badge warning variant)
    - Middle dot separators (`·`)
    - "Updated {formatted date}" — format as "May 3, 2026" (full date for detail view)
  - Horizontal divider (`border-t border-neutral-200 my-6`)
  - Rendered Markdown content: `<div className="prose prose-neutral lg:prose-lg max-w-none">` wrapping `<ReactMarkdown>` with `remarkGfm` plugin
    - Links in rendered Markdown: `target="_blank" rel="noopener noreferrer"` for external links
    - Configure `react-markdown` components to override link rendering
  - Bottom navigation: repeat "← Back to articles" and "Edit" button
- If article is a draft: show amber info strip at top of content area — "This article is a draft and not visible to others." — `bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md mb-6`

**What to verify:**
- Visit `/articles/getting-started` — renders title, metadata, Markdown content
- Visit `/articles/nonexistent` — shows 404 page
- Visit `/articles/code-review-guidelines` — shows draft badge and amber info strip
- Markdown renders correctly: headings, bold, lists, code blocks, tables (if present)
- Edit button links to correct edit page
- "Back to articles" returns to `/`

---

## Task 2.7: Create Not-Found & Error Pages

**Files:** `src/app/not-found.tsx`, `src/app/articles/[slug]/not-found.tsx`, `src/app/error.tsx`

### Global Not Found (`src/app/not-found.tsx`)
- Rendered when `notFound()` is called or a route doesn't match
- Uses EmptyState component: `FileQuestion` icon, "Article not found", "The article you're looking for doesn't exist or has been deleted.", action → "Browse articles" `/`
- Wrapped in the root layout (header, sidebar, footer still visible)

### Article-Level Not Found (`src/app/articles/[slug]/not-found.tsx`)
- Same as global but scoped to article routes
- Falls back to global not-found if this file doesn't exist (but create it for consistency)

### Error Boundary (`src/app/error.tsx`)
- Client Component (`'use client'`)
- Props: `error: Error`, `reset: () => void`
- Renders: `AlertCircle` icon, "Something went wrong", "We couldn't complete your request. Please try again.", "Try again" button (calls `reset()`)
- `bg-white rounded-lg p-8` centered in the page

**What to verify:**
- Visit a non-existent route → global not-found page renders
- Visit `/articles/nonexistent-slug` → article not-found page renders
- Error boundary catches rendering errors (can test by temporarily throwing in a Server Component)

---

## Iteration 2 Completion Checklist

- [ ] All base UI components render correctly in isolation
- [ ] Layout shell renders header, sidebar, main content, footer
- [ ] Sidebar shows "All Articles" and category list
- [ ] Mobile hamburger menu opens/closes sidebar drawer
- [ ] Home page (`/`) shows published articles with pagination
- [ ] Article detail page (`/articles/[slug]`) shows rendered Markdown
- [ ] Draft article detail shows draft badge and info strip
- [ ] 404 pages render for missing routes and missing articles
- [ ] Error boundary renders on component errors
- [ ] Skip-to-content link is functional
- [ ] All focus-visible rings are present on interactive elements
- [ ] Responsive: mobile layout shows stacked cards, hamburger menu works