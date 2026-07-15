# Iteration 5 Summary — Full-text search

**Date:** 2026-07-13  
**Status:** Complete  
**Exit criteria:** Met

---

## What was built

Shipped search-first discovery: debounced header typeahead via `GET /api/search`, and a shareable SSR results page at `/search?q=`, both powered by SQLite FTS5 over **published** title + content only.

### T5.1 — `searchArticles` in `src/lib/fts.ts`

| Piece | Detail |
|-------|--------|
| `toFtsQuery` | Existing pure sanitizer (prefix `*`, AND tokens) |
| `searchArticles({ query, limit })` | FTS MATCH + join `Article` + optional `Category`; `status = 'PUBLISHED'`; `snippet(..., 2, '<mark>', '</mark>', '…', 12)`; `bm25` ASC |
| Limit | Default 10, clamp 1–20 |
| DTO | `SearchResultItem` / `SearchArticlesResult` shared by API + page |
| Safety | `sanitizeFtsSnippet` keeps only `<mark>` wrappers |

### T5.2 — `GET /api/search`

`src/app/api/search/route.ts`:

- Reads `q`, `limit` (default 10, max 20)
- Empty `q` → `200` `{ query, results: [] }`
- Success shape: `id`, `slug`, `title`, `excerpt`, `status`, `category`
- Errors → `500` `{ error: "Search failed. Try again." }` (no stack)

### T5.3 — `SearchBox`

`src/components/search/SearchBox.tsx` wired in `AppHeader`:

- 250ms debounce; min 1 char; `limit=8`
- Dropdown: title + category badge + single-line excerpt; max-h-80 / 50vh mobile
- Keyboard: combobox (`role="combobox"`, listbox, `aria-activedescendant`); ↓/↑; Enter opens highlight or submits `/search?q=`; Esc closes
- Loading spinner + `aria-busy`; empty “No published articles match”; error “Search failed. Try again.”
- “View all results” footer row
- Input `id="header-search"` for empty-page focus link

### T5.4 — Full results page

- `src/app/search/page.tsx` — Server Component; `searchParams.q`
- Empty `q`: “Search the knowledge base” + Focus search → `#header-search`
- With `q`: `searchArticles` limit 20 (SSR; works without client JS for results)
- `SearchResults`: heading + count; title link, category, snippet HTML with marks
- `globals.css` `.search-snippet mark` uses `--color-highlight`
- No filter sidebar

### T5.5 — Revalidation / FTS integrity

Confirmed from Iteration 3 (unchanged):

- `createArticle` / `updateArticle` → `syncArticleToFts`
- `deleteArticle` → `removeArticleFromFts`
- `revalidateArticlePaths` includes `revalidatePath("/search")`

Runtime probe: unique published token appears in search; same row as DRAFT is excluded; delete removes hits.

### T5.6 — Empty and edge states

| Case | Behavior |
|------|----------|
| No matches (`/search`) | “No results for “{q}”” + published-only note + Clear search → `/` |
| Typeahead no matches | Non-interactive status row |
| Special characters | `toFtsQuery` strips → empty results, no 500 |
| Draft-only terms (e.g. `bm25`) | Zero hits |

### Unit tests (boundary)

`tests/unit/fts.test.ts` — `toFtsQuery` + `sanitizeFtsSnippet` (14 total unit tests pass). Full Playwright journey remains Iteration 6.

---

## Assumptions and issues

| Item | Notes |
|------|--------|
| **Prisma `$queryRawUnsafe` for MATCH** | FTS query string is only built from `toFtsQuery` sanitized tokens; limit is integer-clamped. Same pattern as existing FTS write helpers. |
| **API uses `excerpt`, page uses `snippet`** | Matches architecture §5.3 JSON shape for typeahead; full page needs marked snippets. |
| **Draft visibility** | FTS rows may still exist for drafts after status flip; search SQL always filters `PUBLISHED`, so drafts never surface. |
| **No ⌘K** | Per design v1. |
| **README** | Status table + setup blurb updated for live search. |

---

## Verification (local)

```text
npm run db:seed
npm run dev          # http://localhost:3000
npm test             # 14 passed
npx tsc --noEmit     # clean
```

| Check | Result |
|-------|--------|
| `GET /api/search?q=onboarding&limit=8` | `new-hire-onboarding`, `remote-work-tips` |
| `q=deploy` | `how-we-deploy` |
| `q=vacation` | `vacation-pto-policy` |
| `q=experimental` / `q=bm25` (draft-only) | `results: []` |
| `q=` / special chars / notfound | empty, 200 |
| `/search?q=onboarding` | 200, `<mark>` snippets |
| `/search` (no q) | Empty prompt + Focus search |
| `/search?q=zzzzzznotfound` | Empty state copy |
| Create published unique token → search | Hits; draft flip → gone; delete → gone |

App remains runnable; browse → search → edit journey is available for Iteration 6 E2E.

---

## Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| D-I5-1 | **Published-only filter in SQL**, not FTS row deletion on unpublish | Matches architecture; status flips stay simple; search never leaks drafts |
| D-I5-2 | **Snippet column index 2 (content)** | Matches FTS schema order: article_id, title, content |
| D-I5-3 | **Sanitize snippets to mark-only** | Safe `dangerouslySetInnerHTML` without full HTML allowlist |
| D-I5-4 | **Stable `id="header-search"`** on SearchBox input | Empty `/search` “Focus search” deep-link works |
| D-I5-5 | **Unit tests for pure FTS helpers now** | Iteration deliverable “unit-testable at toFtsQuery boundary”; full suite still It. 6 |

---

## Exit criteria checklist

- [x] Header search 250ms debounce shows up to 8 published matches  
- [x] Keyboard ↓/↑ highlight, Enter open/submit, Esc close  
- [x] Enter / “View all” → `/search?q=...`  
- [x] Full page snippets with `<mark>` styling  
- [x] Empty query, no results, failed fetch states handled  
- [x] Seed terms `onboarding`, `deploy`, `vacation` return expected hits  
- [x] Drafts never appear in typeahead or `/search`  
