# Iteration 6 Summary: Testing

**Date:** 2026-05-09
**Status:** Complete

---

## What Was Built

### Task 6.1: Unit Tests — Validators (`__tests__/lib/validators.test.ts`)
- 22 test cases across `articleCreateSchema`, `articleUpdateSchema`, and `categorySchema`
- Tests for: valid data parsing, missing/empty fields, max length enforcement, invalid enum values, defaults, optional/nullable fields

### Task 6.2: Unit Tests — Slug Utility (`__tests__/lib/slug.test.ts`)
- 9 test cases for `generateSlug()`
- Tests for: basic slugification, special characters, whitespace collapse, trimming, fallback to "untitled", uniqueness collision with incrementing suffixes (-2, -3), numeric titles, empty string
- Mocked Prisma via `vi.mock` with `vi.hoisted()` pattern

### Task 6.3: Unit Tests — Search Utility (`__tests__/lib/search.test.ts`)
- 19 test cases: 13 for `stripMarkdown()`, 6 for `searchArticles()`
- `stripMarkdown`: bold, italic, code, links, images, headings, blockquotes, lists, mixed Markdown, truncation at word boundaries
- `searchArticles`: basic query, empty sanitized query, FTS5 character stripping, pagination, BigInt count casting, category mapping, null category

### Task 6.4: Unit Tests — API Route Handlers
- **`__tests__/api/articles.test.ts`**: 14 test cases covering GET (list with pagination, category filter, search delegation), POST (create 201, validation 400), GET by ID (200/404/400), PUT (update, 400 validation, 404), DELETE (204, 404)
- **`__tests__/api/categories.test.ts`**: 2 test cases for GET (populated, empty)
- Used `NextRequest` with absolute URLs for route handler testing

### Task 6.5: E2E Test Fixtures (`e2e/fixtures/test-data.ts`)
- `seedTestArticle()` — creates articles via POST /api/articles
- `deleteTestArticles()` — batch cleanup via DELETE /api/articles/[id]
- `getArticleBySlug()` — finds articles by slug via API

### Task 6.6: E2E Browse Tests (`e2e/browse.spec.ts`)
- 5 tests: home page renders cards, click card → detail page, back to articles link, 404 for nonexistent slug, sidebar categories visible

### Task 6.7: E2E Search Tests (`e2e/search.spec.ts`)
- 5 tests: search finds matching articles, no results empty state, search from detail page, clear search, empty query shows home

### Task 6.8: E2E Edit Tests (`e2e/edit.spec.ts`)
- 2 tests: full create → edit → delete lifecycle, form validation errors

### Data-TestID Attributes
Added to components for reliable E2E selectors:
- `article-card` (on the `<article>` element)
- `search-input`, `search-clear` (SearchBar)
- `article-title-input`, `article-content-textarea`, `article-category-select` (ArticleForm)
- `article-publish-button`, `article-save-draft-button`, `article-save-button`, `article-delete-button` (ArticleForm buttons)

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **`vi.hoisted()` for mock variables** | Vitest's `vi.mock` is hoisted above imports, so variables referenced inside mock factories must also be hoisted. The `vi.hoisted(() => ({ ... }))` pattern solves this cleanly. |
| 2 | **`NextRequest` with absolute URLs** | App Router route handlers use `request.nextUrl`, which requires a `NextRequest` object initialized with an absolute URL. |
| 3 | **`.first()` for E2E desktop/mobile duplicates** | The SearchBar renders both desktop and mobile variants in the DOM (one hidden via CSS). Using `.first()` selects the visible desktop variant reliably. |
| 4 | **Role-based selectors for E2E** | `getByRole('link', { name: '...' })` is more accessible and resilient than text selectors, though regex patterns were needed when link text included counts (e.g., "Guides 1"). |
| 5 | **`useState` initializer for mobile detection** | The MarkdownEditor's `setIsMobile` inside `useEffect` triggered the `react-hooks/set-state-in-effect` lint rule. Fixed by using a lazy initializer for the initial value and keeping only the event listener in the effect. |

---

## Issues Encountered

1. **Zod v4 missing-field errors**: When a field is absent (not provided), Zod v4 returns `"Invalid input: expected string, received undefined"` rather than the `.min(1)` message. Adjusted tests to check `fieldErrors.title` is defined rather than matching exact message.

2. **Prisma 7 BigInt from SQLite `COUNT(*)`**: `$queryRawUnsafe` returns BigInt for counts. The production code already casts with `Number()`, and tests verified both BigInt and numeric paths.

3. **E2E strict mode violations**: Multiple DOM instances of search inputs and sidebar links caused Playwright strict mode failures. Resolved with `.first()` and scoped locators (`nav[aria-label="Sidebar navigation"]`).

4. **`encodeURIComponent` uses `%20` not `+`**: The E2E test expected `q=Getting\+Started` but the URL actually uses `q=Getting%20Started` (standard `encodeURIComponent` behavior). Fixed the URL regex.

5. **Pre-existing lint error fixed**: The MarkdownEditor's `setIsMobile` inside `useEffect` was calling setState synchronously. Moved initial value to a lazy `useState` initializer.

---

## Verification Results

| Check | Status |
|-------|--------|
| `npm run lint` — 0 errors, 0 warnings | ✅ |
| `npx tsc --noEmit` — type-checks clean | ✅ |
| `npm run build` — compiles successfully | ✅ |
| `npm run test` — 67 unit tests pass | ✅ |
| `npm run test:e2e` — 12 E2E tests pass | ✅ |
| Validator schema tests (22 cases) | ✅ |
| Slug utility tests (9 cases) | ✅ |
| Search utility tests (19 cases) | ✅ |
| Articles API tests (14 cases) | ✅ |
| Categories API tests (2 cases) | ✅ |
| Browse E2E (5 tests) | ✅ |
| Search E2E (5 tests) | ✅ |
| Edit E2E (2 tests) | ✅ |
| All `data-testid` attributes present | ✅ |

---

## Test Totals

- **Unit tests (Vitest)**: 67 tests across 5 files
- **E2E tests (Playwright)**: 12 tests across 3 files
- **Total**: 79 passing tests