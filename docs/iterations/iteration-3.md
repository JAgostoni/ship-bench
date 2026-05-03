# Iteration 3 — Search

## Goal

Add full-text search across article titles and content using SQLite FTS5, surfaced through the header search input with a debounced results dropdown. By the end, a user can type in the search bar and see ranked results with highlighted snippets.

---

## Tasks

### 3.1 FTS5 Migration & Index

Apply the FTS5 virtual table and sync triggers to the database.

**Steps:**
1. **Apply the FTS5 migration** (prepared in Iteration 1.7 as `drizzle/migrations/002_add_fts5.sql`):
   - Run `npx drizzle-kit push` to apply the schema including the FTS5 virtual table
   - Or use the SQLite CLI directly: `sqlite3 data/knowledge-base.db < drizzle/migrations/002_add_fts5.sql`
2. Verify the FTS index is populated from existing articles (the `AFTER INSERT` trigger backfilled should handle seeded articles)
3. Create `src/lib/search.ts` with search logic:
   - `searchArticles(query: string, opts?: { limit?: number })`:
     - Use `db.execute(sql\`SELECT a.id, a.title, a.status, category.name as category_name, snippet(articles_fts, 0, '<mark>', '</mark>', '…', 64) AS content_snippet, rank FROM articles_fts JOIN articles a ON articles_fts.rowid = a.rowid WHERE articles_fts MATCH ${query} ORDER BY rank LIMIT ${limit ?? 20}\`)`
     - Return `{ results[], query }` where each result has: `id`, `title`, `content_snippet` (with `<mark>` highlights), `status`, `category_name`, `rank`
   - Escape user input for FTS5 (handle special characters: `"`, `'`, `-`, AND/OR/NEAR operators)

### 3.2 Search API Route

Create a server-side search endpoint that the client can call.

**Steps:**
1. Create `app/api/search/route.ts` (API route handler — not server action, since search is a GET query):
   - `GET /api/search?q=query&limit=20`:
     - Validate query params with Zod (`q` is required string, `limit` optional number)
     - Call `searchArticles(query)` from `src/lib/search.ts`
     - Return 200 with `{ results, query }`
     - If `q` is empty, return `{ results: [], query: '' }` without hitting the DB
   - Handle errors: 400 for bad input, 500 for server errors
2. Add search to `src/lib/validation.ts` (create this file if it doesn't exist):
   - `searchQuerySchema`: `z.object({ q: z.string().min(1).max(200), limit: z.number().optional().default(20) })`

### 3.3 Search Input with Debounced Dropdown

Build the header search input that queries the API and displays results.

**Steps:**
1. Replace the placeholder search input in `AppHeader` with a functional `<SearchInput />` component:
   - `components/search/SearchInput.tsx`:
     - Debounced input (200–300ms delay) that triggers search
     - Uses `useSWR` with `fetch('/api/search?q=' + query)` for data fetching with caching
     - Keyboard shortcut: `⌘K` / `Ctrl+K` focuses the search input
     - On focus with query: shows the dropdown
     - On empty query: hides dropdown
     - States from design spec Section 1.5: default, focused (accent border + ring), typing (dropdown), empty (dropdown hidden)
2. **SearchDropdown** — `components/search/SearchDropdown.tsx`:
   - Appears below search input, max 360px width
   - Results list: title (14px semibold) with `<mark>` highlights → preview snippet (12px muted) → category (11px muted)
   - Max 8 results visible + scroll
   - Keyboard navigation: `↑`/`↓` arrow keys to highlight, `Enter` to open, `Escape` to close
   - Clicking a result navigates to that article's detail view
   - No results: "No results for '{query}'" with a small icon
   - Loading: skeleton (3 items, 40px tall, animated bars)
   - ARIA: `role="listbox"` on container, `role="option"` on each result, `aria-selected` for highlighted item
3. Integrate the search input into the AppHeader:
   - The SearchInput replaces the placeholder
   - When search is active on mobile, consider a full-width overlay (defer full mobile search experience to post-MVP)

### 3.4 Search Results Page (Optional Dedicated Page)

Create a dedicated search results page at `app/(public)/search/page.tsx` for when users press Enter from the search dropdown or navigate directly with a query parameter.

**Steps:**
1. `app/(public)/search/page.tsx`:
   - Reads `?q=query` from the URL
   - Calls the search API
   - Renders results in a page layout (not just dropdown) — allows seeing more results, with full article preview cards
   - Falls back to dropdown-like results if accessed from the header search
2. Link this page from the SearchInput dropdown "See all results" link (optional)

---

## Iteration Notes

- **Dependency**: Requires Iteration 1 (DB schema, API route infrastructure). Does NOT require Iteration 2 to be complete — search can be developed in parallel with browse since both only need the database.
- The FTS5 migration adds a virtual table (`articles_fts`) that maps to the articles table. Existing seeded articles from Iteration 1 will be indexed by the trigger.
- Search results show **highlighted snippets** using SQLite's `snippet()` function. The `<mark>` tags wrapping matched text are rendered in the dropdown.
- Server Actions are NOT used for search — a standard GET API route is more appropriate for a search endpoint.
- The design spec mentions a search-first approach: the header search is always available. The dedicated search page (Section 3.4) is secondary and can be skipped if time is tight.
- **Testing tip**: During development, verify FTS5 ranking by searching for terms that appear in multiple articles — results should be ordered by relevance (rank).
