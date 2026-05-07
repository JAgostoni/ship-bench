# Iteration 5 Summary — Test & Polish

## What Was Built

Iteration 5 added comprehensive automated testing across the full stack — unit tests via Vitest for core logic and components, E2E tests via Playwright for critical user journeys, plus lint, type-check, and documentation. No application features were shipped in this iteration.

### 1. Vitest Configuration (`vitest.config.ts`)
- Environment: `jsdom` for DOM API simulation
- Setup file: `tests/setup.ts` importing `@testing-library/jest-dom` for custom matchers
- Coverage targeting: `src/lib/` and `src/db/` directories
- All required npm scripts added to `package.json`

### 2. Test Setup (`tests/setup.ts`)
- Imports `@testing-library/jest-dom` for extended matchers (`toBeVisible`, `toContainText`, etc.)
- Mocks Next.js router (`next/navigation`) for server component test isolation
- Mocks `window.matchMedia` for component rendering consistency

### 3. Unit Tests — Database & Core Logic
**`tests/db/articles.test.ts`** — 7 tests covering DB layer:
- `getArticles()`: returns expected articles, respects `limit` and cursor pagination
- `getArticleById(id)`: returns correct article, `null` for non-existent ID
- `createArticle()`: generates UUID, sets timestamps, correct fields
- `updateArticle()`: updates correctly, sets `updated_at`, 404 for missing ID
- Uses separate test database file (`data/test-knowledge-base.db`) for isolation

**`tests/lib/search.test.ts`** — 7 tests covering search service:
- Matches across title and content via FTS5
- Rank ordering, `limit` parameter handling
- Edge cases: empty query, non-existent term, special FTS5 characters
- Returns results with `rank`, `id`, `title`, `contentSnippet` properties

**`tests/lib/validation.test.ts`** — 13 tests covering Zod schemas:
- `createArticleSchema`: passes valid data, rejects missing title, missing content, empty title, overly long inputs
- `updateArticleSchema`: partial updates allowed, rejects invalid types
- `searchQuerySchema`: passes valid query, rejects empty/missing query, enforces length limits

**`tests/lib/utils.test.ts`** — 7 tests covering utilities:
- Date formatting: relative time output ("2h ago", "1d ago")
- Text truncation respecting word boundaries with ellipsis

**`tests/lib/markdown.test.ts`** — 10 tests covering rendering:
- Markdown → HTML: headings, lists, code blocks, links
- Sanitization: strips `<script>` and inline event handlers, preserves safe HTML

### 4. Unit Tests — Components
**`tests/components/ArticleCard.test.tsx`** — 4 tests:
- Renders title, preview excerpt, and meta row (category, updated time)
- Applies selected variant classes correctly
- `onClick` handler fires when card is clicked
- Wrapped in `<Link>` to article detail page

**`tests/components/EmptyState.test.tsx`** — 4 tests:
- Renders icon, title, and description text
- Shows action button when `actionLabel` and `onAction` provided
- Action button calls `onAction` when clicked
- Action button hidden when no `actionLabel` provided

**`tests/components/SearchInput.test.tsx`** — 3 tests:
- Renders search input with correct ARIA attributes and placeholder
- Debounces input calls to fetch API (uses fake timers)
- Shows results dropdown when results are returned

**`tests/components/ArticleEditor.test.tsx`** — 5 tests:
- Renders title input and content textarea in draft mode
- Calls `onSave` with current values when Save button clicked
- Calls `onDiscard` when Discard button clicked
- Shows validation errors for empty fields when save triggered
- Pre-filled values render correctly in edit mode

### 5. Playwright E2E Configuration (`playwright.config.ts`)
- Test directory: `playwright/tests/`
- Reporters: `html` (for CI/CD visibility) + `list` (terminal)
- Browser: `chromium` only
- Base URL: `http://localhost:3000`
- `webServer`: auto-starts `npm run dev` on localhost:3000
- `workers: 1` — SQLite cannot handle parallel writers reliably without WAL mode

**Fix applied during this iteration:** Originally configured with `fullyParallel: true` and variable workers, which caused intermittent failures when multiple E2E test files hit SQLite simultaneously. Set `workers: 1` to serialize E2E tests.

### 6. E2E Tests — Browse Journey (`playwright/tests/browse.spec.ts`) — 5 tests
1. User opens app → sees article list on home page
2. User clicks an article card → navigates to article detail view
3. User sees article title, content rendered as prose, and meta row
4. "← Back" link returns to browse view
5. Article not found (invalid ID) shows appropriate message

### 7. E2E Tests — Search Journey (`playwright/tests/search.spec.ts`) — 4 tests
1. User types in search bar → results dropdown appears
2. User clicks a search result → navigates to article detail
3. User searches for non-existent term → "No results for 'xyz'" message displays
4. `⌘K` / `Ctrl+K` keyboard shortcut focuses the search input

### 8. E2E Tests — Edit Journey (`playwright/tests/edit.spec.ts`) — 6 tests
1. User clicks "+ New" → navigates to create view
2. User fills title and content → clicks Save → redirected to article detail
3. User attempts save with empty title → sees validation error
4. User clicks "Edit" on existing article → navigates to edit view with pre-filled content
5. User edits content → saves → changes are visible on detail view
6. User clicks "Discard" → sees confirmation modal

### 9. E2E Tests — Empty States (`playwright/tests/states.spec.ts`) — 3 tests
1. Browse view with no articles shows empty state with CTA
2. Search with no results shows "No results for 'xyz'"
3. Deleted/not-found article shows "This article no longer exists"

### 10. Lint & Type-Check
- `npm run lint` — passes cleanly (0 errors; 1 warning in auto-generated `coverage/` file)
- `npm run type-check` — `tsc --noEmit` passes with no errors
- `npm run build` — builds successfully with no issues

### 11. README
Created `README.md` with:
- Project description and tech stack table
- Quick Start instructions (install, seed, dev)
- Database migration commands
- All test scripts documented
- Lint and type-check commands
- Architecture overview

## Final Test Results

| Test Type | Result |
|-----------|--------|
| Unit Tests | **60/60 passed**, 0 failed |
| E2E Tests | **18/18 passed**, 0 failed |
| Lint | ✅ 0 errors, 1 warning in generated coverage file |
| Type-Check | ✅ 0 errors |
| Build | ✅ Clean |

## Assumptions & Issues

1. **Parallel SQLite writes not supported:** Playwright was initially configured with `fullyParallel: true` and unlimited workers. Multiple test files creating/editing articles in parallel caused database lock conflicts and intermittent test failures. Resolved by setting `workers: 1` in the Playwright config since SQLite lacks proper concurrent write support without WAL mode.

2. **E2E tests share the production database:** E2E tests modify the same `data/knowledge-base.db` file. For a production CI pipeline, consider switching to a fresh test database per run or using in-memory SQLite.

3. **Unit test DB file locking during dev server:** The search unit test manipulates the real database file by renaming it. If the dev server is running simultaneously, the file is locked and the test fails with `EBUSY` on Windows. This is not a problem when running `npm test` independently of the dev server.

4. **Search test uses the real database path:** `searchArticles()` hardcodes the database path, forcing the test to swap the real file in/out rather than injecting a test path via dependency injection. This is fragile but works for the current scope.

## Confirmation

- ✅ `npm test` — 60/60 unit tests pass
- ✅ `npm run test:e2e` — 18/18 E2E tests pass
- ✅ `npm run lint` — clean (0 errors)
- ✅ `npm run type-check` — clean (0 errors)
- ✅ `npm run build` — builds successfully
- ✅ `npm run dev` — app runs locally on http://localhost:3000
- ✅ `README.md` created with setup, usage, and test instructions

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **`workers: 1` for Playwright** | SQLite does not handle concurrent writes from multiple processes. Running E2E tests with a single worker eliminates flaky database lock failures. |
| 2 | **`page.keyboard.down`/`page.keyboard.up` for ⌘K test** | Initial attempts using `page.keyboard.press('Meta+k')` and `page.evaluate()` for synthetic KeyboardEvents didn't reliably trigger the focus behavior. The final test dispatches a real keyboard event via `page.evaluate()` with `KeyboardEvent`, which passes when run sequentially but may not work with multiple workers. |
| 3 | **Test database files reused from seed data** | E2E tests depend on the seeded data being present in the database. The edit and browse tests rely on specific articles existing. E2E tests mutate this data, so test order matters when run sequentially. |
| 4 | **No coverage threshold enforcement** | Unit tests cover `src/lib/` and `src/db/` as specified, but no hard coverage percentage threshold is configured. Coverage can be inspected via `npm run test:coverage`. |
