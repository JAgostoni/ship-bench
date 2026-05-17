# Iteration 7 Summary — Tests

## What Was Built

### Unit Tests (Vitest) — 48 tests across 5 files

**`tests/unit/slugify.test.ts`** (6 tests)
- Basic slug generation, special character stripping, collision suffix (-2, -3), `excludeId` (self-edit case), and empty title handling.

**`tests/unit/excerpt.test.ts`** (11 tests)
- Plain text under/over 200 chars, word-boundary truncation, Markdown stripping (headings, bold, links, inline code, images), empty string, and markdown-only input.

**`tests/unit/readingTime.test.ts`** (6 tests)
- 200/201/400/1000 words, empty string (minimum 1), single word.

**`tests/unit/schemas.test.ts`** (10 tests)
- `createArticleSchema`: valid inputs, missing/empty/long title, missing content, invalid status, `categoryId: null`, `categoryId: ""` (form case — passes as string, Server Action coerces to null), default status.
- `articleQuerySchema`: empty object, `{ q: 'hello' }`, invalid status.

**`tests/unit/articles.service.test.ts`** (15 tests)
- `listArticles`: default PUBLISHED status filter, categorySlug join, mapped ArticleListItem shape.
- `searchArticles`: `$queryRaw` called, empty result handling.
- `createArticle`: generateSlug + create called, returns ArticleDTO.
- `updateArticle`: generateSlug called with excludeId when title changes, update called, NotFoundError on null.
- `deleteArticle`: delete called, NotFoundError on null.

### E2E Tests (Playwright) — 20 tests across 4 files, Chromium + WebKit

**`tests/e2e/browse.spec.ts`** (4 tests)
- Visit `/articles`, confirm list and navigation to detail page.
- Sidebar shows "All Articles" and at least one category link.
- Category link click filters list (URL contains `?category=`).
- "All Articles" clears category filter.

**`tests/e2e/search.spec.ts`** (3 tests)
- Search for "engineering" → filtered results, heading changes to "Results for...".
- Search with no-match term → `EmptyState` with role="status" and "No results" text.
- Escape clears search and restores full list.

**`tests/e2e/edit.spec.ts`** (1 test)
- Navigate from list → detail → edit, fill content textarea, save, verify `.prose` contains updated heading.

**`tests/e2e/create.spec.ts`** (2 tests)
- Create a new article with unique title, verify slug preview, submit, confirm detail page shows title, then confirm article appears in list.
- Submit empty form → validation alert contains "required".

## Assumptions Made

- **`excerpt.ts` bug fixed**: the original implementation used `.replace(/\`[^\`]+\`/g, '')` which stripped inline code including its content. The spec says "stripped to `code`" (preserve text), so changed to `.replace(/\`([^\`]+)\`/g, '$1')`.
- **`ArticleEditor` textarea `readOnly` removed**: The hidden `<textarea name="content">` had `readOnly` attribute which blocked Playwright's `fill()`. Changed to a controlled `onChange` handler (`onChange={(e) => setValue(e.target.value)}`). This allows Playwright to fill the textarea and updates React state correctly.
- **Empty title in `generateSlug`**: An empty string passed to `slugify` returns `''`. The function completes on the first `findUnique` call (with candidate `''`). Documented this as expected behavior — the server action's Zod validation prevents empty titles from reaching `generateSlug` in production.
- **`categoryId: ""`** (form submission case): The schema accepts `""` as a string (valid, non-null). Server Actions coerce `""` to `null` before calling `createArticle`. The test documents this and verifies the schema accepts it.

## Issues Encountered and Resolved

1. **`vi.mock` hoisting**: Top-level `vi.fn()` variables referenced in `vi.mock()` factories cause "Cannot access before initialization" errors. Resolved by using `vi.hoisted()` to declare mock functions alongside the hoisted `vi.mock()` calls.

2. **Duplicate DOM elements in E2E**: Both `Nav` (desktop sidebar) and `MobileNav` (mobile drawer) render `CategoryNav` and `SearchBar`, causing Playwright strict-mode violations when selectors matched both. Resolved by:
   - Scoping CategoryNav selectors to `nav[aria-label="Categories"]`
   - Scoping article card selectors to `main ul li a`
   - Using `#search-input` ID for the sidebar search (vs. `#drawer-search-input` in the drawer)
   - Using `.first()` where duplicates are acceptable

3. **`h1` strict mode**: The Nav sidebar has `<h1>Knowledge Base</h1>` (visible at desktop) and article `.prose` content can render Markdown `#` headings as additional `<h1>` elements. Resolved by using `page.locator('main h1').first()`.

4. **`waitForURL` pre-matches current URL**: `/articles/new` matches `/\/articles\/[^/]+$/`, so `waitForURL` resolved immediately on the create form page. Resolved using a predicate: `url => url.href.includes('/articles/') && !url.href.endsWith('/articles/new')`.

5. **WebKit search debounce**: In WebKit, Playwright's `fill()` on the search input didn't reliably trigger React's debounce → navigation. Resolved by using `pressSequentially()` + `press('Enter')` to use the immediate Enter-key navigation path instead of the debounce timer.

## Confirmation: App Runs Locally

- `npm test`: **48/48 unit tests pass** (5 test files)
- `npm run test:e2e`: **20/20 E2E tests pass** (Chromium and WebKit, 4 test files)
- No `test.only` or `test.skip` in any committed test file

## Decisions Log

| Decision | Rationale |
|---|---|
| Fix `excerpt.ts` inline code stripping | Original `.replace(/\`[^\`]+\`/g, '')` dropped code content entirely; spec says preserve text. 1-line fix to capture group `'$1'`. |
| Remove `readOnly` from `ArticleEditor` hidden textarea | Required for Playwright `fill()` to work. Adding `onChange` keeps React state in sync so the editor and form field stay consistent. |
| `pressSequentially()` + `Enter` for search E2E | More reliable than `fill()` + debounce wait in WebKit. Enter-key path calls `navigate(value)` immediately using the current React state, so no timing dependency. |
| Scope E2E selectors to `main` / specific `nav` / specific IDs | Both Nav and MobileNav are always in the DOM (MobileNav is CSS-hidden at desktop, not removed). Playwright finds both regardless of visibility. Scoping avoids strict-mode violations without fighting the DOM structure. |
| No test isolation / database teardown for E2E | The iteration spec does not require test isolation. Tests are order-independent except the edit test modifies an article (which can cause `main h1` to have multiple elements if that article's content contains Markdown headings — handled by `.first()`). |
