# Iteration 7 — Tests

## Goal

Implement and verify the full test suite as defined in the product brief's testing scope: Vitest unit tests for core logic, and Playwright E2E tests for critical user journeys (browse → search → edit). All tests must pass against the running application with the seeded database.

## Scope

**Unit tests (Vitest):**
- `src/lib/slugify.ts` — slug generation and collision suffix logic
- `src/lib/excerpt.ts` — Markdown stripping and truncation
- `src/lib/readingTime.ts` — reading time computation
- `src/lib/schemas.ts` — Zod schema validation for valid and invalid inputs
- `src/lib/articles.ts` — service functions with mocked Prisma client

**E2E tests (Playwright):**
- Browse — visit `/articles`, see list, click into detail
- Search — type in search bar, see filtered results, clear search
- Edit — navigate to edit, change content, save, verify update
- Create — create a new article, verify it appears in list
- Empty state — search with no results, verify EmptyState renders

---

## Task List

### 7.1 — Unit test: `slugify.ts`

Create `tests/unit/slugify.test.ts`:

Test cases to cover:
- `generateSlug('Hello World', mockPrisma)` → `'hello-world'` (no collision)
- `generateSlug('Hello World!', mockPrisma)` → `'hello-world'` (strips special chars via `strict: true`)
- Collision: if `'hello-world'` exists in the DB, returns `'hello-world-2'`
- Double collision: if both `'hello-world'` and `'hello-world-2'` exist, returns `'hello-world-3'`
- `excludeId`: if the only match for `'hello-world'` is the article being edited (same `id`), returns `'hello-world'` (no suffix needed)
- Empty title: should return a non-empty slug (or throw — document the expected behavior and test it)

**Mocking Prisma:** use `vi.fn()` to mock `prisma.article.findUnique` to simulate collisions:

```ts
const mockPrisma = {
  article: {
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient;
```

Set `mockPrisma.article.findUnique.mockResolvedValueOnce(null)` for no-collision cases and `mockResolvedValueOnce({ id: 'existing' })` for collision cases.

### 7.2 — Unit test: `excerpt.ts`

Create `tests/unit/excerpt.test.ts`:

Test cases to cover:
- Plain text under 200 chars → returned as-is, no ellipsis
- Plain text over 200 chars → truncated at word boundary, appended with `…`
- Markdown with heading `# Title` → stripped of `#`, leading text returned
- Markdown with bold `**word**` → stripped to `word`
- Markdown with a link `[text](url)` → returns `text` (not the URL)
- Markdown with inline code `` `code` `` → stripped to `code`
- Empty string → returns `''`
- String with only Markdown syntax and no text → returns `''` or a minimal result (document expected behavior)
- Truncation must not cut mid-word: "Lorem ipsum dolor sit amet" truncated at 20 chars should end at a full word

### 7.3 — Unit test: `readingTime.ts`

Create `tests/unit/readingTime.test.ts`:

Test cases to cover:
- 200 words → `1`
- 201 words → `2`
- 400 words → `2`
- 0 words (empty string) → `1` (minimum)
- 1 word → `1`
- 1000 words → `5`

### 7.4 — Unit test: Zod schemas

Create `tests/unit/schemas.test.ts`:

Test cases for `createArticleSchema`:
- Valid input (title + content + status + optional categoryId) → `.parse()` succeeds
- Missing title → parse throws with `title` issue
- Empty title (`""`) → parse throws with `title` issue (min 1)
- Title over 200 chars → parse throws
- Missing content → parse throws
- Invalid status (not `'DRAFT'` or `'PUBLISHED'`) → parse throws
- `categoryId: null` → valid (nullable optional field)
- `categoryId: ""` — this is the form submission case; confirm the schema handles it (either coerce to null or mark as invalid depending on implementation decision — document and test whichever is chosen)

Test cases for `articleQuerySchema`:
- Empty object → valid, all fields `undefined`
- `{ q: 'hello' }` → valid
- `{ status: 'INVALID' }` → parse throws

### 7.5 — Unit test: article service layer

Create `tests/unit/articles.service.test.ts`:

Mock the Prisma client using `vi.mock` or manual mock objects. Test:

**`listArticles()`:**
- Calls `prisma.article.findMany` with `status: 'PUBLISHED'` by default
- When `categorySlug` is provided, includes the category join filter
- Maps results to `ArticleListItem[]` with `excerpt` and `readingTimeMinutes` attached

**`searchArticles(query, opts)`:**
- Calls `prisma.$queryRaw` with the FTS query template
- Returns mapped `ArticleListItem[]`

**`createArticle(data)`:**
- Calls `generateSlug` (mock it) and `prisma.article.create`
- Returns the created article with `excerpt` and `readingTimeMinutes`

**`updateArticle(id, data)`:**
- When `title` is changed, calls `generateSlug` with `excludeId`
- Calls `prisma.article.update`
- Throws `NotFoundError` if Prisma returns null/throws P2025 (record not found)

**`deleteArticle(id)`:**
- Calls `prisma.article.delete`
- Throws `NotFoundError` if Prisma throws P2025

Use `vi.mock('@/lib/prisma', () => ({ prisma: mockPrismaClient }))` at the top of the test file.

### 7.6 — E2E test: browse journey

Create `tests/e2e/browse.spec.ts`:

```ts
test('browse: visit /articles, see article list, navigate to detail', async ({ page }) => {
  await page.goto('/articles');
  // Article list is visible
  await expect(page.locator('ul li')).toHaveCount(/* at least */ 1);
  // At least one article card has a title link
  const firstCard = page.locator('ul li a').first();
  await expect(firstCard).toBeVisible();
  // Click the first card → navigate to detail page
  await firstCard.click();
  // Detail page shows h1 with the article title
  await expect(page.locator('h1')).toBeVisible();
  // Back link is visible
  await expect(page.getByText('Articles')).toBeVisible();
});
```

Additional cases in this file:
- Confirm the sidebar shows the "All Articles" link and at least one category link
- Confirm clicking a category link filters the article list (URL contains `?category=...`)
- Confirm "All Articles" link removes the category filter

### 7.7 — E2E test: search journey

Create `tests/e2e/search.spec.ts`:

```ts
test('search: type in search bar, see filtered results, clear', async ({ page }) => {
  await page.goto('/articles');
  // Type a search term known to match at least one seeded article
  const searchInput = page.getByLabel('Search articles');
  await searchInput.fill('engineering');
  // Wait for debounce + navigation
  await page.waitForURL(/\?q=engineering/);
  // Results should be visible (at least 1 article)
  await expect(page.locator('ul li')).not.toHaveCount(0);
  // Page heading changes to "Results for..."
  await expect(page.locator('h1')).toContainText('Results for');
});

test('search: empty results show EmptyState', async ({ page }) => {
  await page.goto('/articles');
  const searchInput = page.getByLabel('Search articles');
  await searchInput.fill('zzzznowaythisexists');
  await page.waitForURL(/\?q=zzzznowaythisexists/);
  // EmptyState is shown (role="status" with no results text)
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('No results');
});

test('search: clear search with Escape restores full list', async ({ page }) => {
  await page.goto('/articles?q=engineering');
  const searchInput = page.getByLabel('Search articles');
  await searchInput.press('Escape');
  await page.waitForURL('/articles');
  // Full article list restored
  await expect(page.locator('ul li')).toHaveCount(/* more than search results */ 1);
});
```

### 7.8 — E2E test: edit journey

Create `tests/e2e/edit.spec.ts`:

```ts
test('edit: open article, edit content, save, verify update on detail page', async ({ page }) => {
  await page.goto('/articles');
  // Navigate to an article detail page
  await page.locator('ul li a').first().click();
  await page.waitForURL(/\/articles\/.+/);
  // Click the Edit button
  await page.getByRole('link', { name: /edit/i }).click();
  await page.waitForURL(/\/articles\/.+\/edit/);
  // The title field is pre-populated
  const titleInput = page.getByLabel(/title/i);
  await expect(titleInput).not.toHaveValue('');
  // Change the content (type in the editor textarea)
  // The MD editor textarea is inside the component; target it by its name attribute
  const editorTextarea = page.locator('textarea[name="content"]');
  await editorTextarea.fill('# Updated Content\n\nThis was edited by the E2E test.');
  // Submit the form
  await page.getByRole('button', { name: /save changes/i }).click();
  // Redirected back to detail page
  await page.waitForURL(/\/articles\/.+/);
  await expect(page.locator('.prose')).toContainText('Updated Content');
});
```

### 7.9 — E2E test: create journey

Create or add to `tests/e2e/browse.spec.ts` (or a separate `create.spec.ts`):

```ts
test('create: create new article and verify it appears in list', async ({ page }) => {
  const uniqueTitle = `Test Article ${Date.now()}`;
  await page.goto('/articles/new');
  // Fill in title
  await page.getByLabel(/title/i).fill(uniqueTitle);
  // Confirm slug preview appears after blur
  await page.getByLabel(/title/i).blur();
  await expect(page.getByText(/URL: \/articles\//)).toBeVisible();
  // Fill in content via the hidden textarea (MD editor)
  await page.locator('textarea[name="content"]').fill('Hello from the E2E test.');
  // Submit
  await page.getByRole('button', { name: /create article/i }).click();
  // Redirected to the new article detail page
  await page.waitForURL(/\/articles\/.+/);
  await expect(page.locator('h1')).toContainText(uniqueTitle);
  // Navigate back to list and confirm the article appears
  await page.goto('/articles');
  await expect(page.getByText(uniqueTitle)).toBeVisible();
});

test('create: shows validation errors for empty submission', async ({ page }) => {
  await page.goto('/articles/new');
  await page.getByRole('button', { name: /create article/i }).click();
  await expect(page.getByRole('alert').first()).toContainText('required');
});
```

### 7.10 — E2E test: empty state

Create `tests/e2e/search.spec.ts` (already created in 7.7) or verify coverage:

The "No results for 'zzzznowaythisexists'" test in task 7.7 covers the `no-results` empty state variant. Additionally confirm:
- On first visit with an empty database, the `empty` variant shows — this can be tested by hitting `GET /api/articles` to confirm no articles, then visiting `/articles`. (Optional: a reset/teardown Playwright fixture can delete all articles before this test.)

### 7.11 — Run the full test suite

```bash
# Unit tests
npm test
# Expected: all unit tests pass

# E2E tests (requires running dev server and seeded database)
npm run test:e2e
# Expected: all E2E tests pass on Chromium and WebKit
```

Confirm:
- All Vitest unit tests pass (`tests/unit/**/*.test.ts`)
- All Playwright E2E tests pass across both browser projects (Chromium and WebKit)
- No test has `test.only` or `test.skip` committed

---

## Iteration Notes

- E2E tests depend on the seeded database state from iteration 1. The search test uses the term "engineering" — confirm the seed data includes at least one article whose title or content contains this word.
- The hidden `<textarea name="content">` (iteration 5, task 5.2) is how Playwright interacts with the MD editor — it fills the hidden textarea directly rather than trying to type into the split-pane editor's CodeMirror instance. Confirm the hidden textarea is in the DOM and writable from Playwright's perspective (`fill()` should work).
- Use `Date.now()` in the create test to generate a unique title and avoid collisions between test runs.
- The `webServer` config in `playwright.config.ts` starts the Next.js dev server automatically for E2E runs. Confirm the dev server can start cleanly (`npm run dev` exits 0 or is already running on port 3000 when `reuseExistingServer: true`).
- Do not add E2E tests for responsive/mobile breakpoints — that is explicitly out of scope for MVP testing per the brief ("not MVP: exhaustive E2E edge-case coverage").
- Vitest unit tests do not hit the database. If any test inadvertently imports the real Prisma singleton, mock it at the module level with `vi.mock('@/lib/prisma')`.
