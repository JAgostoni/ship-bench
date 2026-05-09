# Iteration 5: Organization & Status (Stretch Features 4–5)

**Goal:** Add category-based browsing and article status visibility handling. After this iteration, categories are navigable from the sidebar with filtered article lists, and draft articles have proper visibility controls.

**Scope:** Stretch — features 4 (categories) and 5 (draft/published status handling). The infrastructure (schema, seed data, form fields) for both already exists.

---

## Task 5.1: Build Category Navigation Component

**File:** `src/components/categories/category-nav.tsx`

Server Component (can be used inside Server Components that pass data). Props: `categories: Array<{ id: number; name: string; slug: string; articleCount: number }>`, `activeSlug?: string`

- Renders inside the sidebar
- "All Articles" link at top:
  - Active (no activeSlug): `font-semibold`
  - Links to `/`
- Category list below, each item:
  - Name as link to `/categories/[slug]`, `py-2 px-3 rounded-md`
  - Article count badge: `text-xs text-neutral-400 ml-auto`
  - Active: `bg-neutral-100 font-semibold border-l-2 border-blue-600`
  - Hover: `bg-neutral-50`
- Sorted alphabetically by name
- Empty state: no categories shown, only "All Articles"

**What to verify:** Categories render with correct article counts. Active category highlighted. Clicking navigates to category page. "All Articles" returns to home.

---

## Task 5.2: Wire CategoryNav into Sidebar

**File:** `src/components/layout/sidebar.tsx` (update)

- Fetch categories via Prisma (in the root layout, pass as prop, or fetch inside the Sidebar Server Component)
- Pass categories and `activeSlug` to `CategoryNav`
- The sidebar already has the structure from Iteration 2 — replace the placeholder category list with CategoryNav

**Approach for data fetching:** Since the sidebar is shown on every page, fetch categories in the **root layout** (`src/app/layout.tsx`) and pass them down via props or a context. The root layout is a Server Component, so it can call Prisma directly. The sidebar is a Client Component (due to mobile drawer state), so it receives categories as a prop.

**What to verify:** Sidebar shows all categories with article counts on every page. Active category is highlighted on category pages. Mobile drawer also shows categories.

---

## Task 5.3: Build Category Listing Page

**File:** `src/app/categories/[slug]/page.tsx`

Server Component. Implementation:

- Accept `params: Promise<{ slug: string }>` and `searchParams: Promise<{ page?: string }>`
- Fetch category by slug via Prisma
  - If not found: `notFound()`
- Fetch published articles in this category, ordered by `updatedAt DESC`, paginated (20 per page)
- Render:
  - Page heading: category name as `<h1>`, article count below ("{count} articles")
  - Same ArticleList/ArticleCard layout as home page
  - Empty state if no articles: `FolderOpen` icon, `No articles in {category.name}`, "Articles assigned to this category will appear here.", action → "Browse all articles" `/`
  - Pagination (same component, baseUrl = `/categories/[slug]`)

**What to verify:** Visit `/categories/guides` — shows articles in the Guides category. Visit `/categories/nonexistent` — 404. Empty category shows empty state. Pagination works. Draft articles are excluded.

---

## Task 5.4: Implement Draft Status Visibility Rules

**Files:** Update `src/app/page.tsx`, `src/lib/search.ts`, `src/app/categories/[slug]/page.tsx`

Enforce that draft articles are hidden from public views:

### Home Page (update)
- Ensure the Prisma query includes `where: { status: 'published' }` — this should already be the case from Iteration 2
- No changes needed if already filtering by status

### Search Results (update `src/lib/search.ts`)
- Add `AND a.status = 'published'` to the FTS5 query's JOIN condition or WHERE clause
- This prevents draft articles from appearing in search results

### Category Pages (already correct)
- The category page query should include `where: { categoryId: X, status: 'published' }`

### Article Detail (update `src/app/articles/[slug]/page.tsx`)
- Draft articles ARE accessible via direct URL (for author preview) — this is the intended behavior
- Already handled: the article detail page fetches by slug regardless of status

### Draft Badge on Detail (update)
- Already implemented in Iteration 2
- Verify: draft articles show amber "Draft" badge and info strip on detail page

**What to verify:**
- Draft article does NOT appear on home page
- Draft article does NOT appear in category listings
- Draft article does NOT appear in search results
- Draft article IS accessible via direct URL `/articles/code-review-guidelines`
- Draft article detail page shows draft badge and amber info strip
- Publishing a draft makes it immediately visible in all list views (via revalidatePath)
- Unpublishing an article hides it from list views

---

## Task 5.5: Add Category Nav to Mobile Drawer

**File:** `src/components/layout/sidebar.tsx` (update)

- The mobile drawer already renders sidebar content from Iteration 2
- Verify that CategoryNav renders correctly inside the mobile drawer
- Touch targets: each category item must have minimum 44px height (`py-2` + line height should suffice)
- Close drawer on category selection (navigate to category page, close drawer)

**What to verify:** On mobile, open hamburger menu → categories are listed → tap a category → navigates to category page → drawer closes.

---

## Iteration 5 Completion Checklist

- [ ] CategoryNav component renders with correct article counts
- [ ] Sidebar shows categories on every page (desktop and mobile)
- [ ] Active category is highlighted in sidebar
- [ ] Category page shows filtered articles with correct heading
- [ ] Empty category shows appropriate empty state
- [ ] Category pagination works
- [ ] Draft articles are hidden from home page, categories, and search
- [ ] Draft articles are accessible via direct URL
- [ ] Draft badge and info strip appear on draft detail page
- [ ] Publishing/unpublishing updates visibility in real-time
- [ ] Mobile drawer includes categories with proper touch targets