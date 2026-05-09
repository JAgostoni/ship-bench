# Iteration 3 Summary: Search

**Date:** 2026-05-09
**Status:** Complete

---

## What Was Built

### Task 3.1: Slug Utility (`src/lib/slug.ts`)
- `generateSlug(title)` — slugifies a title string (lowercase, replace non-alphanumeric with hyphens, trim/collapse hyphens)
- Handles empty/all-special-character titles by falling back to `"untitled"`
- Uniqueness check: queries Prisma for existing slugs, appends `-2`, `-3`, etc. on collision

### Task 3.2: FTS5 Search Utility (`src/lib/search.ts`)
- `searchArticles(query, page, limit)` — FTS5 MATCH query via `prisma.$queryRawUnsafe` with parameter binding
- Prefix search: each word in the query gets a `*` suffix for partial matching
- FTS5 special character sanitization: strips quotes, hyphens, colons, parentheses, plus, and asterisk (which break FTS5 column/operator syntax)
- Returns paginated results with total count for pagination
- `stripMarkdown(markdown, maxLength)` — strips Markdown formatting for excerpt generation

### Task 3.3: SearchBar Component (`src/components/search/search-bar.tsx`)
- Client Component with URL-driven query state (derived from `useSearchParams`, no effect-driven `setState`)
- **Header variant**: compact `h-9` input in desktop, icon-button + expandable overlay on mobile with backdrop
- **Page variant**: full-width `h-12` input
- **Debounce**: 300ms before navigating to `/?q=term`
- **Enter key**: triggers immediate navigation
- **Clear button**: X icon appears when query is non-empty, clears query and navigates to `/`
- **Spinner**: `Loader2` animated icon replaces search icon while navigation is pending
- **Escape key**: clears query and collapses mobile overlay
- **Accessibility**: `sr-only` label, `aria-label` on clear button, `autoComplete="off"`

### Task 3.4: Search Integration on Home Page (`src/app/page.tsx` update)
- Reads `searchParams.q` promise: if present, calls `searchArticles()` instead of default Prisma query
- Search results reuse the existing `ArticleList` component
- **Info banner**: `Results for "{query}" — N articles found. [Clear search]` with blue styling
- **Empty results**: `EmptyState` with `SearchX` icon, descriptive message, "Browse all articles" action
- Post-filter: draft articles excluded from search results in the page component
- Pagination preserves the `q` query param via `Pagination`'s `searchParams` prop

### Task 3.5: SearchBar Wired into Header (`src/components/layout/app-shell.tsx` update)
- `SearchBar` rendered inside `AppShell` (client component), wrapped in `<Suspense>` (required by `useSearchParams`)
- Passed to `Header` via the existing `searchSlot` prop
- Appears in header on all pages — home, article detail, and future pages

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **URL-derived query, not effect-driven state sync** | The ESLint `react-hooks/set-state-in-effect` rule flags setting state in effects. Deriving `queryFromUrl` from `useSearchParams()` and using a `previousUrlQuery` ref for external URL changes avoids cascading renders. `isSearching` is computed via `useMemo` comparing input state against URL state. |
| 2 | **FTS5 special char sanitization** | FTS5 treats hyphens as column prefix operators (e.g., `column-name:value`). Queries like `getting-started` caused `no such column: started` errors. Strip `-`, `:`, `(`, `)`, `+`, `*` from search terms so the query always works. |
| 3 | **BigInt count casting** | `COUNT(*)` from `$queryRawUnsafe` with SQLite returns BigInt in the Prisma 7 adapter. Must cast with `Number()` before using in `Math.ceil()`. |
| 4 | **`--z-modal` CSS variable** | Added `--z-modal: 55` to the design tokens for the mobile search overlay. Sits between sidebar backdrop (`40`) and skip-link (`60`). |
| 5 | **`blue-500` focus ring** | Used `blue-500` for search bar focus ring to match the existing blue link color and sidebar active indicator (`border-blue-600`). |

---

## Issues Encountered

1. **BigInt/count mismatch**: `COUNT(*)` in `$queryRawUnsafe` returns BigInt in SQLite via Prisma 7 adapter. `Math.ceil(BigInt / number)` throws `TypeError: Cannot mix BigInt and other types`. Fixed with `Number()` cast.
2. **FTS5 hyphen-as-operator**: Query `getting-started` produced `SQLITE_ERROR: no such column: started` because FTS5 interprets `-` as a column prefix operator. Fixed by stripping hyphens and other FTS5 special characters during query sanitization.
3. **ESLint `set-state-in-effect`**: Initial implementation used `useEffect` to sync query from URL params. ESLint flagged this. Refactored to derive state directly from `useSearchParams()` with a `previousUrlQuery` state for detecting external URL changes.

---

## Verification Results

| Check | Status |
|-------|--------|
| `npm run build` compiles successfully | ✅ |
| `npm run lint` passes with 0 errors, 0 warnings | ✅ |
| `npx tsc --noEmit` passes | ✅ |
| `/?q=getting` — shows matching published articles | ✅ |
| `/?q=reference` — finds the API reference article | ✅ |
| `/?q=nonexistent` — shows empty search results state | ✅ |
| `/?q=code+review` — draft article excluded from results | ✅ |
| `/?q=getting-started` — hyphenated query works | ✅ |
| `/?q=` — empty query returns home page | ✅ |
| `/articles/[slug]` — search bar visible in header | ✅ |
| Search bar renders on all pages | ✅ |
| Mobile: search icon expands overlay | ✅ |
| Clear button removes search and returns to `/` | ✅ |
| Info banner with "Clear search" link on search results | ✅ |
| Pagination preserves `q` parameter | ✅ |
