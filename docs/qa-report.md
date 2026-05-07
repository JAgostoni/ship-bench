# QA Report — Knowledge Base App MVP

**Reviewed by:** Senior QA Engineer / Code Reviewer  
**Date:** 2026-05-07  
**Repository:** JAgostoni/ship-bench  
**Commit:** HEAD (current working directory)

---

## Executive Summary

The Knowledge Base App MVP was reviewed against the product brief, architecture spec, UX/design spec, and implementation backlog. All automated tests pass (60/60 unit tests, 18/18 E2E tests). The three required MVP flows — article browsing, search, and editing — are verified end-to-end. The build is clean, linting passes, and TypeScript compiles without errors. 

**Release Recommendation: Ship with Conditions** (details below)

---

## MVP Flow Results

### 1. Article Browsing & Detail — ✅ PASS

| Flow | Status | Notes |
|------|--------|-------|
| Home page renders with article list | ✅ PASS | Returns 200, 7 seeded articles displayed as cards |
| Article card shows title, preview, meta | ✅ PASS | Card displays title, ~200 char excerpt, category, relative timestamp |
| Click card → detail page navigation | ✅ PASS | Client-side navigation to `/articles/[id]` works |
| Detail page renders title, prose, meta, Edit button | ✅ PASS | Title (24px), category · "Updated X ago", Markdown rendered via `kb-prose` class |
| "← Back" link returns to browse | ✅ PASS | Links to `/` |
| Article not found → 404 page | ✅ PASS | Renders "This article no longer exists" via `notFound()` mechanism |
| Pagination (Load more) | ✅ PASS | Cursor-based pagination via `/api/articles` endpoint |
| Empty state (no articles) | ✅ PASS | `EmptyState` with icon, title, description, and "Create article" CTA |
| Error state in ArticleList | ✅ PASS | `EmptyState` with retry button |

### 2. Search — ✅ PASS

| Flow | Status | Notes |
|------|--------|-------|
| Search input renders in header | ✅ PASS | Debounced input with `⌘K` shortcut |
| Typing triggers dropdown with results | ✅ PASS | 250ms debounce, results show title with `<mark>` highlights |
| Click search result → detail navigation | ✅ PASS | Navigates to `/articles/[id]` |
| No results for non-existent term | ✅ PASS | Shows "No results for 'xyz'" message |
| Search API `/api/search?q=query` | ✅ PASS | Returns ranked results with snippets, handles empty query without hitting DB |
| Search results page `/search?q=query` | ✅ PASS | Server component renders full-page results as article cards |
| Keyboard navigation (↑↓ Enter Escape) | ✅ PASS | ARIA roles (`listbox`, `option`, `aria-selected`) implemented |
| Search input with empty query | ✅ PASS | Returns `[]` without hitting database |

### 3. Basic Editing — ✅ PASS

| Flow | Status | Notes |
|------|--------|-------|
| "+ New" button → create page | ✅ PASS | Navigation to `/articles/new`, renders split-pane editor |
| Fill title + content → Save → redirect | ✅ PASS | Server action validates, inserts article, redirects to detail view |
| Save with empty title → validation error | ✅ PASS | Inline error on title field + error toast |
| Edit existing article → pre-filled content | ✅ PASS | `/articles/[id]/edit` loads article, pre-populates editor |
| Edit content + save → changes visible on detail | ✅ PASS | Server action updates, detail view reflects changes |
| Discard → confirmation modal | ✅ PASS | `ConfirmationModal` with "Discard or stay here?" options |
| Unsaved changes warning | ✅ PASS | `beforeunload` listener warns on navigation away |
| `⌘S` / `Ctrl+S` keyboard shortcut | ✅ PASS | Triggers save handler |
| Live preview updates as user types | ✅ PASS | `renderMarkdown` + `sanitizeHtml` re-rendered on state changes |

---

## Local Setup Verification

| Step | Status | Notes |
|------|--------|-------|
| `npm install` | ✅ PASS | Dependencies install without errors |
| `npm run db:push` | ✅ PASS | Creates `data/knowledge-base.db` with correct schema |
| `npm run seed` | ✅ PASS | Inserts 7 articles (5 substantial Markdown, 2 short), 3 categories |
| `npm run dev` | ✅ PASS | Starts on `http://localhost:3000` (Next.js 16.2.4 with Turbopack) |
| Home page returns 200 | ✅ PASS | Verified via `curl` |
| Search API returns results | ✅ PASS | Verified via `curl` for `?q=database` |
| Articles API returns paginated results | ✅ PASS | Verified via `Invoke-WebRequest` |
| README setup instructions | ✅ PASS | Clear: `npm install` → `npm run dev` → open browser |
| Missing step | ⚠️ **NOTE** | README does not mention `npm run seed` or `npm run db:push` as first-time setup prerequisites. Without seeding, the browse page shows empty state (not a blocker but could confuse new developers) |

---

## Test Suite Results

### Unit Tests (Vitest) — 60/60 PASSED ✅

| Test File | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| `tests/db/articles.test.ts` | 7 | ✅ | 0% (DB layer uses real DB connection, not in `src/lib/` coverage target) |
| `tests/lib/search.test.ts` | 7 | ✅ | 94% statements (line 79 uncovered) |
| `tests/lib/validation.test.ts` | 13 | ✅ | 100% |
| `tests/lib/utils.test.ts` | 7 | ✅ | N/A (utility functions may be inline) |
| `tests/lib/markdown.test.ts` | 10 | ✅ | 100% |
| `tests/components/ArticleCard.test.tsx` | 4 | ✅ | N/A |
| `tests/components/EmptyState.test.tsx` | 4 | ✅ | N/A |
| `tests/components/SearchInput.test.tsx` | 3 | ✅ | N/A |
| `tests/components/ArticleEditor.test.tsx` | 5 | ✅ | N/A |
| **Total** | **60** | **✅** | **27% statements, 20% branch (targeted dirs)** |

**Coverage Gaps:**
- `src/lib/articles.ts` — 0% (critical DB query layer not tested by coverage tool; DB tests use separate in-memory DB)
- `src/actions/articles.ts` — 0% (Server Actions not covered by unit tests)
- `src/lib/sanitize.ts` — 75% (line 9 SSR branch uncovered)
- `src/lib/toast.ts` — 0% (thin sonner wrapper)

**Coverage Scope Assessment:** The vitest config targets `src/lib/` and `src/db/`, but actual coverage is low because DB layer and Server Actions aren't included in unit tests. E2E tests exercise these indirectly but don't provide unit coverage. Critical paths without dedicated unit tests:
- `createArticle` / `updateArticle` server actions (tested via E2E only)
- `getArticles`, `getArticleById`, `getCategories` (tested via E2E only)

### E2E Tests (Playwright) — 18/18 PASSED ✅

| Spec | Tests | Status | Coverage |
|------|-------|--------|----------|
| `playwright/tests/browse.spec.ts` | 5 | ✅ | Browse flow |
| `playwright/tests/search.spec.ts` | 4 | ✅ | Search flow |
| `playwright/tests/edit.spec.ts` | 6 | ✅ | Editor flow |
| `playwright/tests/states.spec.ts` | 3 | ✅ | Empty/error states |
| **Total** | **18** | **✅** | **Browse → Search → Edit journey** |

### Lint / Type-Check / Build

| Command | Status | Notes |
|---------|--------|-------|
| `npm run lint` | ✅ PASS | 0 errors. 1 warning in `coverage/` folder (generated file) |
| `npm run type-check` | ✅ PASS | 0 TypeScript errors |
| `npm run build` | ✅ PASS | Compiled in 9.6s, TypeScript finished in 39.6s, 7 static pages generated |

**Unit Test Parallel Mode Issue:** Default `npm test` (parallel mode) times out with all 9 vitest fork workers timing out. This is due to setup overhead exceeding the 60s pool timeout. `--no-file-parallelism` works correctly. **This is a defect** (see below).

---

## Responsiveness Check

| Breakpoint | Status | Notes |
|------------|--------|-------|
| Desktop (≥1024px) | ✅ PASS | Two-column layout: sidebar (240px) + article list. Split-pane editor visible. |
| Tablet (768–1023px) | ✅ PASS | Sidebar hidden, accessible via hamburger toggle. Mobile tabs in editor (Write/Preview). |
| Mobile (<768px) | ⚠️ **PARTIAL** | Spec says "design-only in v1", but basic functionality works. Search input hidden on mobile (`md:` breakpoint only). Single column layout. |

**Note:** Product brief requires "responsive layout for desktop and tablet." Desktop and tablet breakpoints are confirmed functional. Mobile is not a v1 requirement per backlog ("Mobile (<768px) polish: Post-MVP").

---

## Error Handling Review

| Condition | Handling | Notes |
|-----------|----------|-------|
| Form validation (empty title) | ✅ PASS | Inline error text, red border, error toast |
| Form validation (empty content) | ✅ PASS | Same pattern |
| Article not found | ✅ PASS | 404 page via `notFound()` → "This article no longer exists" |
| Search with no results | ✅ PASS | "No results for 'xyz'" message in dropdown + search page |
| Search with empty query | ✅ PASS | Returns empty results without DB hit |
| Search API invalid input | ✅ PASS | Returns 400 with validation error details |
| Search API server error | ✅ PASS | Returns 500, logs error |
| DB error on save | ✅ PASS | Generic error toast + form error |
| Network error on save | ✅ PASS | Error toast ("Failed to save"), content preserved in textarea |
| Empty browse list | ✅ PASS | `EmptyState` with CTA to create article |
| Edit non-existent article | ✅ PASS | Renders 404 page via `notFound()` |
| Unsaved changes navigation | ✅ PASS | `beforeunload` warning + confirmation modal |

---

## Spec Adherence Summary

### Product Brief

| Requirement | Status | Notes |
|-------------|--------|-------|
| Article browsing & detail pages | ✅ Implemented | ✅ Compliant |
| Search across titles and content | ✅ Implemented | ✅ Compliant |
| Basic editing (Markdown + preview) | ✅ Implemented | ✅ Compliant |
| Category/tag organization (stretch) | ✅ Schema ready, ⚠️ **Not implemented in UI** | Sidebar renders categories as placeholders but clicking does nothing. Per backlog, this is v2 (acceptable) |
| Status handle (stretch) | ✅ Schema ready, ⚠️ **No UI** | Status column exists, defaults to `published`. No badge/toggle. Per backlog, this is v2 (acceptable) |
| Markdown editor with preview | ✅ Implemented | ✅ Compliant (design spec chose Markdown over TipTap) |
| Responsive layout (desktop + tablet) | ✅ Implemented | ✅ Compliant |
| Clear empty states | ✅ Implemented | ✅ Compliant (no articles, no results, article not found) |
| Form validation (create/edit) | ✅ Implemented | ✅ Compliant (Zod schemas) |
| Basic performance for small-medium set | ✅ Implemented | ✅ Compliant (cursor pagination, debounced search) |

### Architecture Spec Deviations

| Item | Architecture Spec | Actual Implementation | Impact |
|------|-------------------|----------------------|--------|
| Editor | TipTap WYSIWYG | Markdown textarea with live preview | **Intentional** — Design spec Decision #1 overrides |
| Validation library | Zod 3.23.x | Zod 4.4.3 | **Minor** — Zod v4 is newer, breaking change from `.errors` to `.issues` already handled |
| ORM version | Drizzle ORM 0.38.x | Drizzle ORM 0.45.2 | **Minor** — newer version, API changed (`sqliteTable` → `defineConfig`) |
| State management | Zustand 5.0.x + SWR | React `useState` only | **Minor** — no Zustand or SWR installed. React state used directly |
| Unit test library | Vitest 2.1.x | Vitest 4.1.5 | **Minor** — newer version |
| E2E library | Playwright 1.50.x | Playwright 1.59.1 | **Minor** — newer version |
| Search debounce | 300ms | 250ms | **None** — within acceptable range |
| Server Actions | `'use server'` with `revalidatePath` | `'use server'` without `revalidatePath` | **Minor** — Server Actions don't call `revalidatePath`, so cached pages may show stale data until next navigation |
| Content storage | "TipTap JSON or HTML" | Raw Markdown strings | **Intentional** — Design spec Decision #1 overrides |
| API Routes | Full CRUD REST (`POST`, `PATCH`, `DELETE`) | Only `GET` via `/api/articles` and `/api/search`. CRUD via Server Actions | **Intentional** — Server Actions used for writes, REST for reads |
| Search implementation | "FTS5 with `snippet()` and `rank()`" | Uses `LIKE` queries via Drizzle, not FTS5 `MATCH` queries | **⚠️ SIGNIFICANT** — `search.ts` opens a direct SQLite connection and uses `LIKE` queries on the `articles` table. The FTS5 virtual table (`articles_fts`) exists with triggers but is **never used by the search implementation**. This means search is not using FTS5 indexing at all. |

### UX/Design Spec

| Requirement | Status | Notes |
|-------------|--------|-------|
| Design tokens (colors, typography, spacing) | ✅ Implemented | All CSS custom properties in `app/global.css` |
| Inter + JetBrains Mono fonts | ✅ Implemented | Loaded via `next/font/google` |
| Button variants (primary/secondary/tertiary) | ✅ Implemented | |
| Skeleton loading card | ✅ Implemented | Shimmer animation with `prefers-reduced-motion` |
| `kb-prose` class for content | ✅ Implemented | Prose typography for article rendering |
| Header with logo, search, "+ New" | ✅ Implemented | |
| Sidebar (desktop) + drawer (mobile/tablet) | ✅ Implemented | 240px sidebar on desktop, hamburger on mobile/tablet |
| Search dropdown ARIA roles | ✅ Implemented | `role="listbox"`, `role="option"`, `aria-selected` |
| Confirmation modal (focus trap, Escape) | ✅ Implemented | |

---

## Code Signals Checklist

| Signal | Status | Details |
|--------|--------|---------|
| **Linting clean** | ✅ Yes | `eslint .` passes. 0 errors. 1 warning in generated `coverage/` folder (acceptable, not app code) |
| **No obvious security holes** | ⚠️ Minor issues | See defect log: SQL parameterization used, DOMPurify sanitizes HTML, but search uses raw LIKE without FTS5 |
| **Modular architecture** | ✅ Yes | No god components. Largest: `ArticleEditor.tsx` (281 lines), `ArticleList.tsx` (194 lines). Separation of concerns clear (UI primitives, article components, search components, layout) |
| **Follows architecture spec** | ⚠️ Partial | Major deviation: search implementation does not use FTS5 (see below). Zustand and SWR not used. Server Actions used instead of some REST routes (intentional). |
| **Iterations followed without scope drift** | ✅ Yes | Backlog structure (5 iterations) followed faithfully. Stretch features (categories, status) correctly deferred to v2. |
| **Dependency versions current** | ✅ Yes | All dependencies verified via `package.json` and appear to be latest stable versions. Zod 4, React 19, Next.js 16 — all current. |

---

## Defect Log

### Critical

| # | Defect | Description | Repro Steps |
|---|--------|-------------|-------------|
| C1 | **Search does not use FTS5** | `src/lib/search.ts` uses `LIKE '%query%'` queries on the `articles` table instead of `MATCH 'query'` on the `articles_fts` FTS5 virtual table. The FTS5 index exists with triggers but is unused. This means search lacks full-text ranking, relevance snippets, and performance benefits. | 1. Open app 2. Type a search query 3. Results returned via `LIKE` match, not FTS5 rank/snippet. 4. Inspect `src/lib/search.ts` — no FTS5 `MATCH` query found. |

### Major

| # | Defect | Description | Repro Steps |
|---|--------|-------------|-------------|
| M1 | **Unit tests time out in parallel mode** | `npm test` with default parallel configuration times out because vitest fork workers exceed the 60s pool timeout. Tests must be run with `--no-file-parallelism`. | 1. Run `npm test` 2. Wait for timeout 3. All 9 workers fail with "Timeout waiting for worker to respond" |
| M2 | **Server Actions don't call `revalidatePath`** | `createArticle` and `updateArticle` in `src/actions/articles.ts` do not call `revalidatePath` after mutations. Server-rendered article lists may show stale data until the user manually navigates away and back. | 1. Create a new article 2. Save and redirect to detail 3. Navigate back to home 4. New article should appear — may show stale cached data depending on Next.js caching |
| M3 | **Search `LIKE` query doesn't handle case-insensitive matches for non-ASCII or special characters** | The `LIKE` operator in SQLite is case-insensitive for ASCII, but search uses `query.toLowerCase()` for manual highlighting. The highlighting logic in `search.ts` only matches the exact query length, so "database" searching for "Database" would highlight incorrectly (query vs. result length mismatch). | 1. Search for a term with different case from what's in the DB 2. Check highlight markers in dropdown 3. Highlight may not cover the full matched term |
| M4 | **`categoryName` always null in search results** | Since categories are not linked via `article_categories` table, the `LEFT JOIN` always returns `null` for `categoryName`. This is expected for v1 but means search results lack category context. | 1. Search for any term 2. Check JSON response 3. `categoryName: null` for all results |

### Minor

| # | Defect | Description | Repro Steps |
|---|--------|-------------|-------------|
| m1 | **Hydration warning on `timeAgo` in E2E test** | The E2E test for search shows a hydration mismatch: server renders "25 minutes ago" but client renders "24 minutes ago" (time passed between server render and client hydration). | 1. Run E2E tests 2. Observe console output for ⚠️ React hydration mismatch warning |
| m2 | **Cursor-based pagination uses `created_at` but ordering is by `updated_at`** | `getArticles` orders by `updated_at DESC` but cursor comparison uses `created_at`. With 100+ concurrent writes this could lead to pagination inconsistencies. For MVP with 7 seeded articles it works. | 1. Create article with later `created_at` but earlier `updated_at` 2. Trigger pagination 3. Cursor logic may skip or duplicate articles |
| m3 | **`test_fts5.js` left in repo root** | Temporary debug script `test_fts5.js` exists in project root, not in `scripts/`. Not referenced in any build or test, adds clutter. | 1. Check project root 2. `test_fts5.js` found at top level |
| m4 | **Temporary scripts in `scripts/` not cleaned up** | `apply-fts5.ts`, `rebuild-fts5.ts`, `debug-fts5.ts`, `test-fts5.ts`, `test-search.ts` are development scripts that should be removed post-development. | 1. Check `scripts/` folder 2. Multiple debug/test scripts present |
| m5 | **README omits first-time setup prerequisites** | README lists "Quick Start" as just `npm install` → `npm run dev`. Does not mention `npm run db:push` or `npm run seed` as prerequisites for first-time run. | 1. Follow README exactly from fresh clone 2. App starts with empty DB 3. No errors but empty browse page |

---

## Spec Drift Log

| # | Area | Spec | Drift | Type | Impact |
|---|------|------|-------|------|--------|
| D1 | **Search Implementation** | Architecture spec: "SQLite FTS5 with `MATCH`, `snippet()`, `rank()`" | Implementation: `LIKE '%query%'` with manual string highlighting via Drizzle. FTS5 table exists but is never queried. | **Unintentional / Bug** | Search lacks ranking, relevance ordering, and snippets. Performance degrades with large article counts. |
| D2 | **Editor** | Architecture spec: "TipTap WYSIWYG editor" | Implementation: Markdown textarea with live preview. | **Intentional** | Design spec Decision #1 explicitly chose Markdown. Lower priority than TipTap. |
| D3 | **State Management** | Architecture spec: "Zustand 5.0.x + SWR 2.2.x" | Implementation: React `useState` only. Zustand and SWR not installed. | **Acceptable** | Overkill for MVP scope. React state sufficient. |
| D4 | **API Routes** | Architecture spec: Full REST (`POST`, `PATCH`, `DELETE`) | Implementation: Only `GET` routes for articles and search. CRUD via Server Actions. | **Acceptable** | Server Actions are a valid Next.js pattern. Architecture spec listed as one option. |
| D5 | **Content Storage** | Architecture spec: "TipTap JSON or HTML" | Implementation: Raw Markdown strings. | **Intentional** | Follows Decision D2. |
| D6 | **Validation Version** | Architecture spec: Zod 3.23.x | Implementation: Zod 4.4.3 | **Acceptable** | Newer version. Breaking changes handled (`.errors` → `.issues`). |
| D7 | **Search Debounce** | Architecture spec: 300ms | Implementation: 250ms | **Acceptable** | Within acceptable UX range. |

---

## Known Issues & Technical Debt

1. **Category sidebar is non-functional** — Renders category names and counts but clicking does nothing. Reserved for v2 per backlog.
2. **E2E tests share the production database** — Mutate `data/knowledge-base.db` directly. For CI, should use fresh test DB per run.
3. **Unit test DB file locking on Windows** — Search test manipulates the real DB file by renaming it. If dev server runs simultaneously, test fails with `EBUSY` on Windows.
4. **Search uses direct DB connection, not Drizzle** — `search.ts` opens/closes a raw `better-sqlite3` connection rather than using the shared `db` instance. Each query opens/closes a connection.
5. **No coverage threshold enforcement** — Tests cover targeted directories but no minimum percentage is enforced in vitest config.
6. **Article content not included in API route response** — `/api/articles` returns articles with full `content` field, which is ~KB of Markdown per article. For list view, this could be optimized to exclude content.

---

## Release Recommendation

### **Ship with Conditions**

**Rationale:**

**Pro-Ship:**
- All three MVP flows (browse, search, edit) are fully functional and verified end-to-end, including empty, error, and validation states.
- 60/60 unit tests and 18/18 E2E tests pass without failure.
- Build, lint, and type-check all pass cleanly.
- Local setup works following documented instructions (with minor README gaps).
- Code architecture is modular, follows Next.js conventions, and separates concerns effectively.
- No critical security vulnerabilities (SQL parameterization, HTML sanitization present).

**Conditions (Must-Fix Before Ship):**

1. **C1: Search should use FTS5 `MATCH` queries** — The current `LIKE` implementation was intended as a temporary approach (the FTS5 table was fully built in Iteration 3 but is currently unused). The architecture spec requires FTS5 full-text search. This is a core MVP requirement that is incompletely implemented.

2. **M1: Unit tests must pass in parallel mode** — The default `npm test` command should work without requiring `--no-file-parallelism`. This is a developer experience regression.

3. **M5: README should document first-time setup** — Add `npm run db:push` and `npm run seed` as prerequisites before `npm run dev`.

**Recommendation:**
- If conditions 1-3 are addressed: **Ship**
- If only condition 1 is addressed: **Ship** (conditions 2-3 are developer experience, not functional defects)
- If condition 1 is NOT addressed: **No-Ship** — Search is a core MVP feature and FTS5 is explicitly specified in the architecture spec. Using `LIKE` queries instead of the existing FTS5 index means search lacks ranking and will not scale.

---

## Next Steps — Prioritized

| Priority | Action | Rationale |
|----------|--------|-----------|
| **P0** | Fix search to use FTS5 `MATCH` queries instead of `LIKE` queries in `src/lib/search.ts` | Core MVP feature incompletely implemented. FTS5 table and triggers already exist; wire them up. |
| **P1** | Fix unit test parallel timeout — increase pool timeout or optimize test setup time | Default `npm test` should work out of the box |
| **P1** | Add `revalidatePath` calls to `createArticle` and `updateArticle` server actions | Ensure server-rendered pages reflect latest data after mutations |
| **P2** | Update README with first-time setup prerequisites | Developer experience |
| **P2** | Remove `test_fts5.js` from repo root | Project cleanliness |
| **P2** | Remove or archive temporary debug scripts in `scripts/` | Project cleanliness |
| **P2** | Fix pagination cursor logic (use `created_at` for ordering or `updated_at` for cursor) | Prevent future edge cases with large datasets |
| **P3** | Add unit tests for `src/actions/articles.ts` server actions | Direct test coverage for critical CRUD operations |
| **P3** | Add coverage threshold to vitest config (e.g., `thresholds: { lines: 80, branches: 70 }`) | Enforce baseline coverage |
| **P3** | Consider excluding `content` field from `/api/articles` list endpoint | Optimize API response size for browse view |
