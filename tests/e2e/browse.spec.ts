import { test, expect } from '@playwright/test';

test('browse: visit /articles, see article list, navigate to detail', async ({ page }) => {
  await page.goto('/articles');

  // Article card links are inside <main> (avoids CategoryNav sidebar links)
  const articleLinks = page.locator('main ul li a');
  await expect(articleLinks.first()).toBeVisible();
  expect(await articleLinks.count()).toBeGreaterThanOrEqual(1);

  // Click the first article card → navigate to detail page
  await articleLinks.first().click();
  await page.waitForURL(/\/articles\/[^/]+$/);

  // Detail page shows h1 with the article title (first h1 in main = article title, not prose content)
  await expect(page.locator('main h1').first()).toBeVisible();

  // Back link to articles list is visible
  await expect(page.getByRole('link', { name: /articles/i }).first()).toBeVisible();
});

test('browse: sidebar shows All Articles link and at least one category link', async ({ page }) => {
  await page.goto('/articles');

  // "All Articles" link exists; use .first() to handle desktop nav + mobile drawer duplicates
  await expect(page.getByRole('link', { name: 'All Articles' }).first()).toBeVisible();

  // At least one category link (href contains ?category=)
  await expect(page.locator('a[href*="?category="]').first()).toBeVisible();
});

test('browse: clicking a category link filters the article list', async ({ page }) => {
  await page.goto('/articles');

  // Click the first category link in the desktop sidebar nav
  const categoryLink = page.locator('nav[aria-label="Categories"] a[href*="?category="]').first();
  await categoryLink.click();

  // URL should contain ?category=
  await page.waitForURL(/\?category=/);
  expect(page.url()).toContain('?category=');

  // Article list or empty state is visible
  const list = page.locator('main ul li');
  const emptyState = page.getByRole('status');
  await expect(list.first().or(emptyState)).toBeVisible();
});

test('browse: All Articles link clears category filter', async ({ page }) => {
  await page.goto('/articles?category=engineering');

  // Click the first "All Articles" link (may appear in both desktop nav + mobile drawer)
  await page.locator('nav[aria-label="Categories"] a[href="/articles"]').first().click();
  await page.waitForURL('/articles');
  expect(page.url()).not.toContain('?category=');
});
