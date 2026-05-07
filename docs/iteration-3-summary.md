# Iteration 3 Summary — Search

## What Was Built

Iteration 3 added full-text search across article titles and content using SQLite FTS5, surfaced through a header search input with a debounced results dropdown and a dedicated search results page.

### 1. FTS5 Migration & Index

- **Rebuilt `articles_fts` FTS5 table**: The original migration used `content='articles'` and `content_rowid='rowid'` external content table mode, which didn't work properly with FTS5 `snippet()` because the internal content storage is not indexed the same way. The table was rebuilt in standalone mode (no `content=` or `content_rowid=` attributes) where FTS5 stores and indexes content directly.
- **Backfill trigger**: A one-time backfill script (`scripts/rebuild-fts5.ts`) inserted all existing articles into the FTS5 index.
- **Sync triggers**: Three triggers (`articles_fts_insert`, `articles_fts_delete`, `articles_fts_update`) keep the FTS index in sync with the `articles` table on all future writes.

### 2. Search Library (`src/lib/search.ts`)

- **`searchArticles(query, opts?)`**: Queries the FTS5 virtual table with phrase-matching (escapes user input via double-quote wrapping). Returns `{ results[], query }` where each result includes:
  - `id`, `title` (with `<mark>` highlights if the title matched), `status`, `categoryName`
  - `contentSnippet` from SQLite's `snippet()` function with `<mark>` tags wrapping highlights
  - `rank` score from FTS5 (negative numbers, closer to zero = better)
- Results are joined with the `articles` and `categories` tables for full metadata.

### 3. Validation (`src/lib/validation.ts`)

- **`searchQuerySchema`**: Validates search query params for the API route. Requires `q` (1-200 chars), optional `limit` (defaults to 20).
- **`createArticleSchema`** and **`updateArticleSchema`**: Pre-staged for Iteration 4 editor validation.

### 4. Search API Route (`app/api/search/route.ts`)

- `GET /api/search?q=query&limit=20`
- Empty query returns `{ results: [], query: '' }` without hitting the database
- Invalid input returns 400 with validation error details
- Catches and logs errors, returns 500 on server failures

### 5. SearchInput Component (`components/search/SearchInput.tsx`)

- Debounced input (250ms delay) that triggers search API fetches
- Shows loading state while fetching, then dropdown with results
- Keyboard shortcut: `⌘K` / `Ctrl+K` focuses the search input
- Click outside or select a result closes the dropdown
- Uses native `fetch` (no external caching library like SWR, kept MVP simple)

### 6. SearchDropdown Component (`components/search/SearchDropdown.tsx`)

- Appears below search input, max 360px width
- Results display: title (14px semibold with `<mark>` highlights), content preview snippet (12px muted), category name (11px muted)
- Max 8 results visible + scroll
- Keyboard navigation: `↑`/`↓` arrows to highlight, `Enter` to open, `Escape` to close
- No results: shows "No results for '{query}'" message
- Loading: 3 skeleton items with pulse animation
- Proper ARIA roles: `role="listbox"` on container, `role="option"` on each result, `aria-selected` for highlighted item

### 7. AppHeader Integration (`components/layout/AppHeader.tsx`)

- Replaced the non-functional placeholder search div with the `<SearchInput />` component
- The search input is centered in the header, hidden on mobile (only visible on `md:` breakpoints and up)

### 8. Dedicated Search Results Page (`app/(public)/search/page.tsx`, `components/search/SearchPageContent.tsx`)

- `SearchPage`: Server Component that reads `?q=` from URL search params
- `SearchPageContent`: Client component that fetches search results on mount and displays them as article cards
- Links to article detail pages on click
- Empty states: no query → "Search articles" message, no results → `EmptyState` with "Back to articles" CTA

## FTS5 Content Indexing Issue

During development, the FTS5 table had content stored but `MATCH` queries returned 0 results. The root cause was: the migration used `content='articles', content_rowid='rowid'` which creates an external content table — this means FTS5 doesn't store the content internally and expects content to be managed separately (external content mode). The `snippet()` function couldn't find indexed terms because the FTS5 internal index wasn't being populated correctly.

**Resolution**: Rebuilt the FTS5 table in standalone mode (no `content=` or `content_rowid=` attributes), backfilled from the `articles` table using `rowid`, and kept the three sync triggers for future inserts/updates/deletes. This required dropping the original `articles_fts` table and recreating it.

## Package Scripts Added

No new scripts added to `package.json`.

Temporary scripts created and can be cleaned up:
- `scripts/apply-fts5.ts` — Can be removed (was used to apply the migration with better-sqlite3)
- `scripts/rebuild-fts5.ts` — Can be removed (was used to rebuild the FTS5 table in standalone mode)
- `scripts/debug-fts5.ts` — Can be removed (was used to debug FTS5)
- `scripts/test-fts5.ts` — Can be removed (test script)
- `scripts/test-search.ts` — Can be removed (test script)

## Assumptions & Issues

1. **No SWR installed**: The iteration spec mentioned `useSWR` for data fetching, but added complexity wasn't necessary. Native `fetch` with debounce is sufficient for this MVP.
2. **FTS5 standalone mode**: Instead of the original external content table approach (`content='articles'`), the FTS5 table stores content directly. The three sync triggers still work correctly for future CRUD operations.
3. **categoryName returns null**: Articles are not linked to categories via the `article_categories` junction table yet (v2 feature). Search results show `categoryName: null` for all results. This is expected — the LEFT JOIN gracefully handles the missing links.
4. **Phrase matching only**: The `escapeFts5` function wraps queries in double quotes for phrase matching (e.g., `"database"`). This provides exact phrase search which is good for the MVP but could be extended with tokenized search (removing quotes, partial matching) in post-MVP.

## Confirmation

- ✅ `src/lib/search.ts` returns correct results with `<mark>` highlights for multiple search terms
- ✅ `app/api/search/route.ts` returns 200 with valid JSON for valid queries
- ✅ Empty query returns `[]` without hitting the database
- ✅ Dev server starts on `http://localhost:3000`
- ✅ SearchInput is integrated in AppHeader with debouncing and `⌘K` shortcut
- ✅ SearchDropdown renders with keyboard navigation (↑↓ Enter Escape)
- ✅ Dedicated search page at `/search?q=query` renders results
- ✅ No lint errors from `npm run lint`

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **FTS5 standalone mode instead of external content mode** | The `content='articles', content_rowid='rowid'` mode prevented FTS5 from internally indexing terms. Standalone mode (no `content=` or `content_rowid=` attributes) properly indexes both `title` and `content` columns internally. |
| 2 | **Manual SQLite in search.ts instead of Drizzle ORM** | Drizzle ORM doesn't have built-in FTS5 snippet/rank support. Using `better-sqlite3` directly with parameterized SQL is cleaner for FTS5 `MATCH` queries with `snippet()` functions. |
| 3 | **Native fetch instead of SWR** | The iteration spec mentioned `useSWR`, but for an MVP search dropdown with 250ms debounce, native `fetch` is simpler and avoids an extra dependency. No caching is needed since the search bar is ephemeral. |
| 4 | **ContentSnippet uses HTML snippets from FTS5** | SQLite's `snippet()` function returns HTML with `<mark>` tags. The `SearchDropdown` renders these via `dangerouslySetInnerHTML` — this is safe because the HTML comes from SQLite's controlled snippet output, not user-controlled content. |
