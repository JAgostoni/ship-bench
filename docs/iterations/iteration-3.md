# Iteration 3: Search (MVP Feature 2)

**Goal:** Add full-text search across article titles and content. Users can search from the header bar on any page and see results on the home page.

**Scope:** MVP Feature 2 — search across article titles and content.

---

## Task 3.1: Implement Slug Utility

**File:** `src/lib/slug.ts`

Required for search and article creation. Implementation:

```typescript
import { prisma } from '@/lib/prisma';

export async function generateSlug(title: string): Promise<string> {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .replace(/-+/g, '-');           // Collapse consecutive hyphens

  // Uniqueness check: if slug exists, append -2, -3, etc.
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.article.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}
```

**What to verify:** Basic slug generation works. Special characters stripped. Uniqueness collision generates suffixed slug. Empty title produces a reasonable output.

---

## Task 3.2: Implement FTS5 Search Utility

**File:** `src/lib/search.ts`

Implementation — a function that wraps `prisma.$queryRawUnsafe` with FTS5 MATCH:

```typescript
import { prisma } from '@/lib/prisma';

export async function searchArticles(query: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  // Escape FTS5 special characters and format for prefix search
  const sanitized = query.replace(/['"]/g, '').trim();
  const ftsQuery = sanitized.split(/\s+/).map(term => `${term}*`).join(' ');

  const results = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT a.id, a.title, a.slug, a.excerpt, a.status, a.createdAt, a.updatedAt,
            c.id as categoryId, c.name as categoryName, c.slug as categorySlug
     FROM article_fts f
     JOIN Article a ON a.id = f.rowid
     LEFT JOIN Category c ON a.categoryId = c.id
     WHERE article_fts MATCH ?
     ORDER BY rank
     LIMIT ? OFFSET ?`,
    ftsQuery, limit, offset
  );

  // Get total count for pagination
  const countResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM article_fts f
     JOIN Article a ON a.id = f.rowid
     WHERE article_fts MATCH ?`,
    ftsQuery
  );

  return {
    articles: results.map(mapRowToArticle),
    total: countResult[0]?.count ?? 0,
  };
}

function mapRowToArticle(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: row.categoryId ? {
      id: row.categoryId,
      name: row.categoryName,
      slug: row.categorySlug,
    } : null,
  };
}
```

**Important:** Use parameter binding for the FTS query string — never string interpolation. The `$queryRawUnsafe` name is misleading; parameters are still bound.

Add a helper to strip Markdown from content for excerpt display (if not pre-computed):

```typescript
export function stripMarkdown(markdown: string, maxLength = 200): string {
  let text = markdown
    .replace(/#{1,6}\s/g, '')          // Remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1')     // Italic
    .replace(/`([^`]+)`/g, '$1')       // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
    .replace(/>\s/g, '')               // Blockquotes
    .replace(/[-*+]\s/g, '')           // List markers
    .replace(/\n/g, ' ')               // Newlines to spaces
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
```

**What to verify:** Search for "getting started" returns the Getting Started article. Search for "draft" returns the draft article (since FTS5 searches content). Search for "nonexistent" returns empty results. Rank ordering prefers title matches over content-only matches.

---

## Task 3.3: Build SearchBar Component

**File:** `src/components/search/search-bar.tsx`

Client Component (`'use client'`). Props: `initialQuery?: string`, `variant?: 'header' | 'page'` (for styling differences).

Implementation:

- State: `query` (controlled input value), `isSearching` (boolean)
- On mount: set `query` from `initialQuery` prop
- Input element with:
  - Search icon (`Search` from lucide-react) positioned absolute left, `text-neutral-400`, 20px
  - Placeholder: "Search articles..."
  - Clear button (✕, `X` icon) appears when `query.length > 0`, positioned absolute right
  - Focus: `border-accent-500 ring-2 ring-accent-500/20`
- Debounce: 300ms. On debounce trigger OR Enter key press:
  - Set `isSearching = true`
  - Call `router.push(`/?q=${encodeURIComponent(query)}`)`
  - Set `isSearching = false` after navigation
- Clear button: sets query to `""`, navigates to `/` (removes query param)
- Loading state: `Loader2` spinner (animated) replaces search icon while `isSearching`
- Header variant: compact, `h-9`, max-width 320px on desktop, full-width on mobile when expanded
- Page variant: larger, `h-12`, full width, more prominent
- Accessibility: `<label className="sr-only" htmlFor="search-input">Search articles</label>`, input `id="search-input"`
- Header variant on mobile: search icon button toggles expanded state (overlay), animated slide-down (150ms ease-out)
- Sync with URL: read `useSearchParams()` to keep query in sync if URL changes externally

**What to verify:**
- Typing and pausing 300ms navigates to `/?q=term`
- Pressing Enter navigates immediately
- Clear button resets to `/`
- Search bar retains query text when page loads with `?q=` param
- Mobile: search icon expands overlay, works correctly
- Keyboard accessible: Tab to focus, Enter to submit

---

## Task 3.4: Integrate Search into Home Page

**File:** `src/app/page.tsx` (update)

Update the existing home page Server Component to handle search:

- Read `searchParams.q` (Promise): if present, call `searchArticles()` instead of the default Prisma query
- When search is active:
  - Show a dismissible info banner above results: `Results for "{query}" — {total} articles found. [Clear search]` — Clear search links to `/`
  - Banner: `bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md mb-4`
- Search results use the same `ArticleList` component
- If search returns no results: render EmptyState with `SearchX` icon, `No results for "{query}"`, "Try a different search term or browse all articles.", action → "Browse all articles" `/`
- If no search query: existing behavior (show all published articles)
- Pagination preserves the `q` param: `/?q=term&page=2`
- Draft articles should NOT appear in search results (filter by `status = 'published'` in the search query or post-filter)

**What to verify:**
- Visit `/?q=getting` — shows matching published articles
- Visit `/?q=nonexistent` — shows empty search results state
- Pagination works with search queries
- Clear search removes query param and returns to full article list
- Draft articles do not appear in search results
- Search from the header on any page (e.g., article detail) navigates to `/?q=term` and shows results

---

## Task 3.5: Wire SearchBar into Header

**File:** `src/components/layout/header.tsx` (update)

- Import and render `SearchBar` component in the header's center slot
- Pass current search query from URL params (via `useSearchParams` in a wrapper Client Component, or read from a parent Server Component that passes it down)
- The header search bar uses the `header` variant (compact)

**What to verify:** Search bar is visible and functional in the header on all pages. Searching from a detail page redirects to home with results.

---

## Iteration 3 Completion Checklist

- [ ] Slug generation works correctly including uniqueness collision
- [ ] FTS5 search returns matching articles ranked by relevance
- [ ] Search correctly excludes draft articles
- [ ] SearchBar renders in header across all pages
- [ ] Typing in search bar and pausing debounces to search
- [ ] Enter key triggers immediate search
- [ ] Clear button removes search
- [ ] Home page shows search results with info banner when `?q=` present
- [ ] Pagination works with search queries
- [ ] Empty search results shows appropriate empty state
- [ ] Mobile: search bar expands from icon in header
- [ ] Search from non-home pages redirects to `/?q=term`