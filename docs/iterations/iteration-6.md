# Iteration 6: Testing

**Goal:** Write and verify unit tests for core logic and E2E tests for critical user journeys.

**Scope:** MVP testing — unit tests for core logic, E2E/integration tests for browse → search → edit journeys. Per brief: "Unit tests for core logic AND basic E2E/integration testing (e.g., Playwright) for critical user journeys."

---

## Task 6.1: Write Unit Tests — Validators

**File:** `__tests__/lib/validators.test.ts`

Test the Zod schemas from `src/lib/validators.ts`:

### `articleCreateSchema`
- Valid article with all fields → parses successfully
- Missing title → validation error, "Title is required"
- Title empty string → validation error
- Title > 200 chars → validation error
- Missing content → validation error
- Content > 100,000 chars → validation error
- Invalid status value (e.g., "archived") → validation error
- Default status → `"draft"` when not provided
- Category ID as valid number → accepted
- Category ID as non-existent reference → accepted (Zod doesn't validate FK references, Prisma handles that)

### `articleUpdateSchema`
- All fields optional → partial update accepted
- Empty object → parses successfully
- Providing only title → accepted
- Invalid field → validation error

### `categorySchema`
- Valid category → parses successfully
- Missing name → validation error
- Name > 100 chars → validation error

**What to verify:** All tests pass. Edge cases covered. Error messages are descriptive.

---

## Task 6.2: Write Unit Tests — Slug Utility

**File:** `__tests__/lib/slug.test.ts`

Test `generateSlug()` from `src/lib/slug.ts`:

- Mock `prisma.article.findUnique` to control uniqueness behavior
- Basic title: "Getting Started" → "getting-started"
- Special characters: "What's New?" → "what-s-new"
- Multiple spaces/hyphens: "API   Reference!!!" → "api-reference"
- Leading/trailing special chars: "---Hello---" → "hello"
- Empty-ish title: "!!!" → "" or a minimal fallback (decide: probably "" which should be handled by validation before slug generation)
- Uniqueness collision: title "Getting Started", DB already has "getting-started" → "getting-started-2"
- Already suffixed: "Getting Started" with "getting-started" and "getting-started-2" existing → "getting-started-3"
- Numeric titles: "2026 Roadmap" → "2026-roadmap"

Use `vi.mock('@/lib/prisma', ...)` to mock the Prisma client.

**What to verify:** All slug generation cases pass. Uniqueness collision increments correctly. Tests are isolated (mock DB calls).

---

## Task 6.3: Write Unit Tests — Search Utility

**File:** `__tests__/lib/search.test.ts`

Test `searchArticles()` and `stripMarkdown()` from `src/lib/search.ts`:

### `stripMarkdown()`
- Plain text → unchanged (within limit)
- Bold: `**hello**` → `hello`
- Italic: `*hello*` → `hello`
- Links: `[text](url)` → `text`
- Headings: `# Heading` → `Heading`
- Code: `` `code` `` → `code`
- Lists: `- item` → `item`
- Blockquotes: `> quote` → `quote`
- Mixed Markdown → stripped correctly
- Content shorter than maxLength → full text
- Content longer than maxLength → truncated with "..."
- Truncation breaks at word boundaries

### `searchArticles()`
- Mock `prisma.$queryRawUnsafe` to return controlled results
- Basic query → returns expected results array
- Empty query after sanitization → handled gracefully
- Query with special FTS5 characters → sanitized correctly
- Pagination: first page returns `limit` results, offset calculated correctly
- Total count returned alongside results

**What to verify:** Markdown stripping handles all common syntax. Search function properly constructs queries. Mocking prevents actual DB access.

---

## Task 6.4: Write Unit Tests — API Route Handlers

**Files:** `__tests__/api/articles.test.ts`, `__tests__/api/categories.test.ts`

Test API route handlers by mocking Prisma and calling the handler functions directly:

> **Note:** Next.js App Router route handlers export named functions (`GET`, `POST`, `PUT`, `DELETE`). Import and call them with mock `Request` objects.

### Articles API (`articles.test.ts`)
- `GET /api/articles` — returns paginated published articles
- `GET /api/articles?q=search` — delegates to search
- `GET /api/articles?category=guides` — filters by category
- `GET /api/articles?page=2&limit=10` — pagination works
- `POST /api/articles` — creates article with valid data, returns 201
- `POST /api/articles` — invalid data returns 400 with error details
- `GET /api/articles/[id]` — returns article, 404 if not found
- `PUT /api/articles/[id]` — updates article, 404 if not found, 400 on validation error
- `DELETE /api/articles/[id]` — returns 204, 404 if not found

### Categories API (`categories.test.ts`)
- `GET /api/categories` — returns all categories with article counts

Use `vi.mock('@/lib/prisma', ...)` to mock all Prisma calls. Create helper functions to build mock `Request` objects with query params and body.

**What to verify:** All route handlers return correct HTTP status codes. Validation errors are structured. Mocked Prisma calls match expected queries.

---

## Task 6.5: Create E2E Test Fixtures & Utilities

**File:** `e2e/fixtures/test-data.ts`

Create helpers for seeding and cleaning test data via the API:

- `seedTestArticle(title, content, categoryId?, status?)` → creates via POST /api/articles, returns the article
- `cleanupTestArticles()` → deletes all articles created during tests (track IDs)
- `getArticleBySlug(slug)` → fetches via GET /api/articles?q=... to find by slug

---

## Task 6.6: Write E2E Test — Browse Flow

**File:** `e2e/browse.spec.ts`

Test the critical browse → detail → back user journey:

```typescript
import { test, expect } from '@playwright/test';

test('browse articles, view detail, navigate back', async ({ page }) => {
  // 1. Visit home page
  await page.goto('/');
  
  // 2. Verify article cards are rendered
  await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
  
  // 3. Verify at least one article is present (seeded data)
  const cards = page.locator('[data-testid="article-card"]');
  await expect(cards.first()).toBeVisible();
  
  // 4. Click the first article title
  await cards.first().locator('a').click();
  
  // 5. Verify we're on the article detail page
  await expect(page.locator('h1')).toBeVisible();
  
  // 6. Verify rendered Markdown content is present
  await expect(page.locator('.prose')).toBeVisible();
  
  // 7. Navigate back to articles
  await page.click('text=Back to articles');
  
  // 8. Verify we're back on home page
  await expect(page).toHaveURL('/');
});

test('filter by category from sidebar', async ({ page }) => {
  await page.goto('/');
  
  // Click a category in the sidebar
  await page.click('text=Guides');
  
  // Verify we're on the category page
  await expect(page).toHaveURL(/\/categories\/guides/);
  
  // Verify articles are shown
  await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
});

test('empty category shows empty state', async ({ page }) => {
  // Assuming there's a category with no articles (or create one in test setup)
  // Navigate to an empty category
  await page.goto('/categories/policies');
  
  // Verify empty state (policies has the draft article, which shouldn't show for published-only views)
  // ... adjust test based on seed data
});

test('article not found shows 404', async ({ page }) => {
  await page.goto('/articles/nonexistent-slug-12345');
  
  // Verify 404 content
  await expect(page.locator('text=Article not found')).toBeVisible();
});
```

**Important:** Add `data-testid="article-card"` attributes to the ArticleCard component to make E2E testing reliable.

**What to verify:** All browse tests pass against a running dev server with seeded data.

---

## Task 6.7: Write E2E Test — Search Flow

**File:** `e2e/search.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('search finds matching articles', async ({ page }) => {
  await page.goto('/');
  
  // Type in the search bar
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill('Getting Started');
  await searchInput.press('Enter');
  
  // Verify URL has query param
  await expect(page).toHaveURL(/q=Getting\+Started/);
  
  // Verify results info banner
  await expect(page.locator('text=Results for')).toBeVisible();
  
  // Verify at least one result
  await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
});

test('search with no results shows empty state', async ({ page }) => {
  await page.goto('/?q=xyznonexistent123');
  
  // Verify empty search results state
  await expect(page.locator('text=No results for')).toBeVisible();
  
  // Verify "Browse all articles" link
  await expect(page.locator('text=Browse all articles')).toBeVisible();
});

test('search from article detail page works', async ({ page }) => {
  await page.goto('/articles/getting-started');
  
  // Use the header search bar
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill('API');
  await searchInput.press('Enter');
  
  // Verify we navigated to home with search results
  await expect(page).toHaveURL(/\/\?q=API/);
  await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
});

test('clear search removes results', async ({ page }) => {
  await page.goto('/?q=Getting');
  
  // Click clear button
  await page.click('[data-testid="search-clear"]');
  
  // Verify we're back on home without query
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Results for')).not.toBeVisible();
});
```

**Add `data-testid` attributes:** `search-input` on the search `<input>`, `search-clear` on the clear button.

**What to verify:** All search tests pass. Search works from home page and from other pages. Empty results handled. Clear works.

---

## Task 6.8: Write E2E Test — Edit Flow

**File:** `e2e/edit.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('create, edit, and delete an article', async ({ page }) => {
  const uniqueTitle = `E2E Test Article ${Date.now()}`;
  
  // 1. Navigate to create page
  await page.goto('/articles/new');
  await expect(page.locator('h1')).toBeVisible(); // Form heading or title field
  
  // 2. Fill in the form
  await page.fill('[data-testid="article-title-input"]', uniqueTitle);
  await page.fill('[data-testid="article-content-textarea"]', '# Hello World\n\nThis is a test article.');
  
  // Select a category
  await page.selectOption('[data-testid="article-category-select"]', { label: 'Guides' });
  
  // 3. Publish
  await page.click('[data-testid="article-publish-button"]');
  
  // 4. Verify redirect to article detail
  await expect(page.locator('h1')).toContainText(uniqueTitle);
  await expect(page.locator('.prose')).toContainText('Hello World');
  
  // 5. Navigate to edit
  await page.click('text=Edit');
  await expect(page.locator('[data-testid="article-title-input"]')).toHaveValue(uniqueTitle);
  
  // 6. Modify content
  const updatedContent = '# Updated\n\nContent has been modified.';
  await page.fill('[data-testid="article-content-textarea"]', updatedContent);
  
  // 7. Save
  await page.click('[data-testid="article-save-button"]');
  
  // 8. Verify updated content
  await expect(page.locator('.prose')).toContainText('Content has been modified');
  
  // 9. Delete the article
  await page.click('text=Edit');
  
  // Handle the confirm dialog
  page.on('dialog', dialog => dialog.accept());
  await page.click('[data-testid="article-delete-button"]');
  
  // 10. Verify redirected to home
  await expect(page).toHaveURL('/');
  
  // 11. Verify article is gone
  await expect(page.locator(`text=${uniqueTitle}`)).not.toBeVisible();
});

test('form validation shows errors', async ({ page }) => {
  await page.goto('/articles/new');
  
  // Try to publish without filling anything
  await page.click('[data-testid="article-publish-button"]');
  
  // Verify validation errors
  await expect(page.locator('text=Title is required')).toBeVisible();
  await expect(page.locator('text=Content cannot be empty')).toBeVisible();
  
  // Fill title but exceed limit
  await page.fill('[data-testid="article-title-input"]', 'a'.repeat(201));
  await expect(page.locator('text=Title must be 200 characters')).toBeVisible();
});
```

**Add `data-testid` attributes to ArticleForm:**
- `article-title-input` — title input
- `article-content-textarea` — Markdown textarea
- `article-category-select` — category select
- `article-publish-button` — Publish button
- `article-save-button` — Save button (edit mode)
- `article-delete-button` — Delete button (edit mode)
- `article-save-draft-button` — Save as Draft button

**What to verify:** Full create → edit → delete lifecycle works. Validation errors appear. Article is removed after delete. Updated content persists.

---

## Iteration 6 Completion Checklist

- [ ] All validator unit tests pass
- [ ] All slug utility unit tests pass
- [ ] All search utility unit tests pass
- [ ] All articles API unit tests pass
- [ ] All categories API unit tests pass
- [ ] Browse E2E test: home → detail → back works
- [ ] Browse E2E test: category filtering works
- [ ] Browse E2E test: 404 page works
- [ ] Search E2E test: search finds results
- [ ] Search E2E test: empty results handled
- [ ] Search E2E test: search from non-home page works
- [ ] Search E2E test: clear search works
- [ ] Edit E2E test: create → view → edit → save → verify
- [ ] Edit E2E test: delete article works
- [ ] Edit E2E test: form validation shows errors
- [ ] All `data-testid` attributes are present on components
- [ ] `npm run test` passes all Vitest tests
- [ ] `npm run test:e2e` passes all Playwright tests