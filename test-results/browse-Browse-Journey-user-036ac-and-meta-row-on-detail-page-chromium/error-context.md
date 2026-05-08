# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browse.spec.ts >> Browse Journey >> user sees article title, content, and meta row on detail page
- Location: playwright\tests\browse.spec.ts:31:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1')
Expected: visible
Error: strict mode violation: locator('h1') resolved to 2 elements:
    1) <h1 class="mb-3 text-2xl font-bold text-[var(--color-text)]">Eval Test Article 1778198698915</h1> aka getByRole('heading', { name: 'Eval Test Article' })
    2) <h1>Eval</h1> aka getByRole('heading', { name: 'Eval', exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - button "Toggle sidebar" [ref=e5]:
        - img [ref=e6]
      - link "KB" [ref=e7] [cursor=pointer]:
        - /url: /
    - textbox "Search articles" [ref=e10]:
      - /placeholder: Search articles…
    - link "+ New" [ref=e11] [cursor=pointer]:
      - /url: /articles/new
      - generic [ref=e12]: + New
  - main [ref=e13]:
    - generic [ref=e14]:
      - link "Back" [ref=e15] [cursor=pointer]:
        - /url: /
        - img [ref=e16]
        - text: Back
      - heading "Eval Test Article 1778198698915" [level=1] [ref=e18]
      - time [ref=e20]: Updated 4 minutes ago
      - separator [ref=e21]
      - generic [ref=e22]:
        - heading "Eval" [level=1] [ref=e23]
        - paragraph [ref=e24]:
          - text: This is a
          - strong [ref=e25]: test
          - text: body for eval verification.
      - link "Edit" [ref=e27] [cursor=pointer]:
        - /url: /articles/f57b9fc4-480d-49a0-901f-cd4299ee6c48/edit
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e33] [cursor=pointer]:
    - img [ref=e34]
  - alert [ref=e37]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import type { Page } from '@playwright/test';
  3  | 
  4  | test.describe('Browse Journey', () => {
  5  |   /// Returns a locator for article cards — excludes the "+ New" link at /articles/new
  6  |   function articleCards(page: Page) {
  7  |     return page.locator('a.group[href*="/articles/"]').and(
  8  |       page.locator('a[href*="/articles/"]').and(
  9  |         page.locator('a:not([href*="/articles/new"])')
  10 |       )
  11 |     );
  12 |   }
  13 | 
  14 |   test('user opens app and sees article list on home page', async ({ page }) => {
  15 |     await page.goto('/');
  16 |     await expect(page).toHaveTitle(/Knowledge Base/);
  17 |     const cards = articleCards(page);
  18 |     await expect(cards.first()).toBeVisible();
  19 |   });
  20 | 
  21 |   test('user clicks an article card and navigates to detail view', async ({ page }) => {
  22 |     await page.goto('/');
  23 |     const cards = articleCards(page);
  24 |     await expect(cards.first()).toBeVisible();
  25 |     // Get the href and navigate directly (avoids potential client-side navigation issues in tests)
  26 |     const href = await cards.first().getAttribute('href');
  27 |     await page.goto(href!);
  28 |     await expect(page).toHaveURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);
  29 |   });
  30 | 
  31 |   test('user sees article title, content, and meta row on detail page', async ({ page }) => {
  32 |     await page.goto('/');
  33 |     const cards = articleCards(page);
  34 |     await expect(cards.first()).toBeVisible();
  35 |     // Get the href and navigate directly
  36 |     const href = await cards.first().getAttribute('href');
  37 |     const navigationPromise = page.waitForURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);
  38 |     await page.goto(href!);
  39 |     await navigationPromise;
  40 | 
> 41 |     await expect(page.locator('h1')).toBeVisible();
     |                                      ^ Error: expect(locator).toBeVisible() failed
  42 |     await expect(page.locator('.kb-prose')).toBeVisible();
  43 |   });
  44 | 
  45 |   test('Back link returns to browse view', async ({ page }) => {
  46 |     await page.goto('/');
  47 |     const cards = articleCards(page);
  48 |     await expect(cards.first()).toBeVisible();
  49 |     // Get the href and navigate directly
  50 |     const href = await cards.first().getAttribute('href');
  51 |     const navigationPromise = page.waitForURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);
  52 |     await page.goto(href!);
  53 |     await navigationPromise;
  54 | 
  55 |     await expect(page.locator('h1')).toBeVisible();
  56 |     await expect(page.locator('.kb-prose')).toBeVisible();
  57 |     const backLink = page.getByRole('link', { name: 'Back' });
  58 |     await expect(backLink).toBeVisible();
  59 |     await backLink.click();
  60 |     await expect(page).toHaveURL(/^http:\/\/localhost:3000\//);
  61 |   });
  62 | 
  63 |   test('article not found shows appropriate message', async ({ page }) => {
  64 |     await page.goto('/articles/non-existent-id');
  65 |     await expect(page.getByText('This article no longer exists')).toBeVisible();
  66 |   });
  67 | });
  68 | 
```