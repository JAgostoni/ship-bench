# Iteration 5 — Test & Polish

## Goal

Verify critical user journeys with automated tests and harden the codebase for reviewability. Write unit tests for core logic via Vitest, then write Playwright E2E tests covering the critical journey: browse → search → edit. Finish with linting, type-checking, and run documentation.

---

## Tasks

### 5.1 Set Up Vitest (Unit Testing)

Initialize the unit testing framework and configuration.

**Steps:**
1. Install Vitest and Testing Library: `npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom`
2. Create `vitest.config.ts`:
   - Configure `jsdom` environment
   - Set up `@testing-library/jest-dom` matchers globally (`setupFiles: ['tests/setup.ts']`)
   - Configure coverage to target `src/lib/` and `src/db/`
3. Create `tests/setup.ts`:
   - Import `@testing-library/jest-dom`
   - Configure any test-time mocks (e.g., Next.js `useRouter` mock if needed)
4. Add scripts to `package.json`:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
   - `"test:ui": "vitest --ui"`
   - `"test:coverage": "vitest run --coverage"`

### 5.2 Write Unit Tests — Database & Core Logic

Test the core service functions and utilities.

**Steps:**
1. **DB layer tests** — `tests/db/articles.test.ts`:
   - Test `getArticles()`: returns expected articles, respects `limit`, paginates correctly with `cursor`
   - Test `getArticleById(id)`: returns correct article, returns `null`/`undefined` for non-existent ID
   - Test `createArticle()`: inserts with correct fields, generates UUID, sets timestamps
   - Test `updateArticle(id, data)`: updates correctly, sets `updated_at`, returns 404 for missing ID
   - Use in-memory SQLite or a test database file (`data/test-knowledge-base.db`) for isolation
2. **Search tests** — `tests/lib/search.test.ts`:
   - Test `searchArticles(query)`: returns results matching the query, rank ordering, highlighted snippets
   - Test edge cases: empty query, special FTS5 characters, no-match case
3. **Validation tests** — `tests/lib/validation.test.ts`:
   - Test `createArticleSchema`: passes with valid data, fails with missing title, fails with missing content, fails with overly long inputs
   - Test `searchQuerySchema`: passes with short query, fails with empty/missing query
4. **Utility tests** — `tests/lib/utils.test.ts`:
   - Test date formatting: relative time output ("2h ago", "1d ago")
   - Test text truncation: `truncate(text, maxLen)` returns truncated string with ellipsis
5. **Markdown tests** — `tests/lib/markdown.test.ts`:
   - Test `renderMarkdown()`: converts headings, lists, code blocks, links correctly
   - Test sanitization: strips `<script>` tags, removes `on*` event handlers, allows safe HTML elements

### 5.3 Write Unit Tests — Components

Test key React components render correctly.

**Steps:**
1. **ArticleCard tests** — `tests/components/ArticleCard.test.tsx`:
   - Renders title, preview, meta row
   - Applies correct variant classes (default, selected)
   - Calls `onClick` when clicked
2. **EmptyState tests** — `tests/components/EmptyState.test.tsx`:
   - Renders icon, title, description
   - Shows action button and calls `onAction` when clicked
   - Hides action button when no `actionLabel` provided
3. **SearchInput tests** — `tests/components/SearchInput.test.tsx`:
   - Debounces input (use fake timers)
   - Shows results dropdown when results returned
   - Shows "No results for 'xyz'" when no results
   - Keyboard navigation: `↑`/`↓` highlight items, `Enter` calls `onSelect`
4. **ArticleEditor tests** — `tests/components/ArticleEditor.test.tsx`:
   - Renders title input and content textarea in draft mode
   - Calls `onSave` with current values when Save clicked
   - Calls `onDiscard` when Discard clicked
   - Shows validation errors when fields are empty and save is triggered

### 5.4 Set Up Playwright (E2E Testing)

Initialize Playwright and write tests for the critical user journey.

**Steps:**
1. Install Playwright: `npm init playwright@latest` (or `npm install -D @playwright/test`)
2. Configure `playwright.config.ts`:
   - Test directory: `playwright/tests/`
   - Reporters: `html` (for CI/CD visibility) + `list` (for terminal)
   - Browsers: `chromium` (required), `firefox` and `webkit` optional for v1
   - Base URL: `http://localhost:3000`
3. Add test fixtures:
   - `playwright/fixtures.ts`: helper functions (login, create article via API, navigate to page)
   - Seed a known set of articles before tests (use test database or reset seed)
4. Add scripts to `package.json`:
   - `"test:e2e": "playwright test"`
   - `"test:e2e:ui": "playwright test --ui"`
   - `"test:e2e:headed": "playwright test --headed"`

### 5.5 Write E2E Tests — Critical User Journeys

Write Playwright tests covering the journeys defined in the product brief: **browse → search → edit**.

**Steps:**
1. **Browse journey** — `playwright/tests/browse.spec.ts`:
   - Test: User opens app → sees article list on home page
   - Test: User clicks an article card → navigates to article detail view
   - Test: User sees article title, content rendered as prose, meta row
   - Test: "← Back" link returns to browse view
   - Test: Empty state renders when no articles exist
2. **Search journey** — `playwright/tests/search.spec.ts`:
   - Test: User types in search bar → results dropdown appears
   - Test: User clicks a search result → navigates to article detail
   - Test: User searches for non-existent term → "No results for 'xyz'" displays
   - Test: Keyboard shortcut: `⌘K` focuses the search input
3. **Edit journey** — `playwright/tests/edit.spec.ts`:
   - Test: User clicks "+ New" → navigates to create view
   - Test: User types title and content → clicks Save → redirected to article detail
   - Test: User attempts to save with empty title → sees validation error
   - Test: User clicks "Edit" on existing article → navigates to edit view with pre-filled content
   - Test: User edits content → saves → changes visible in detail view
   - Test: User clicks "Discard" on edit view → sees confirmation modal → cancels or discards
4. **Category/empty states** — `playwright/tests/states.spec.ts`:
   - Test: Browse view with no articles shows empty state with CTA
   - Test: Search with no results shows "No results for 'xyz'"
   - Test: Article deleted/not found shows "This article no longer exists"

### 5.6 Lint, Type-Check & Fix Issues

Run the full validation pipeline and fix all issues.

**Steps:**
1. Run `npm run lint` — fix all ESLint warnings/errors
2. Run `npx tsc --noEmit` — fix all TypeScript errors
3. Run `npm run build` — fix any build-time errors (Next.js build includes stricter checks)
4. Add `"type-check": "tsc --noEmit"` to `package.json` if not present

### 5.7 Verification & README

Produce evidence and run documentation.

**Steps:**
1. Run the full test suite:
   - `npm test` → capture output, ensure all unit tests pass
   - `npm run test:coverage` → capture coverage report, verify ≥80% on `src/lib/` and `src/db/`
   - `npm run test:e2e` → capture output, ensure all E2E tests pass
2. Write `README.md` with:
   - Project description
   - Prerequisites (Node.js 20.x, npm 10.x)
   - Quick Start: `npm install`, `npm run db:push`, `npm run seed`, `npm run dev`
   - Running tests: unit (`npm test`), E2E (`npm run test:e2e`), coverage (`npm run test:coverage`)
   - Database inspection: `sqlite3 data/knowledge-base.db`
   - Architecture summary: Next.js, SQLite, Drizzle ORM, Markdown editor, FTS5 search
3. Verify the app runs end-to-end:
   - Seed fresh database
   - Start dev server
   - Walk through: browse → search → create article → edit article → verify changes
   - Take a screenshot for the evaluator (optional stretch deliverable)

---

## Iteration Notes

- **Dependency**: Requires ALL previous iterations (1-4) to be complete. E2E tests exercise browse, search, and edit journeys — all three must be functional.
- **Testing scope per product brief**: MVP requires unit tests for core logic AND basic E2E for critical user journeys (browse → search → edit). Full accessibility audits and exhaustive E2E edge-case coverage are **NOT** in scope for MVP.
- Test database: E2E tests should use a separate seed or a fresh database instance. Consider using a `data/test-knowledge-base.db` for tests and cleaning it before each test run.
- The Playwright HTML report (`playwright-report/index.html`) serves as evidence that E2E tests exist and pass.
- After this iteration, the codebase should be reviewable: no lint errors, no type errors, all tests green, app runs locally from README instructions.
