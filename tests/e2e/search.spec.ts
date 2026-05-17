import { test, expect } from '@playwright/test';

// Target the sidebar search input by ID (avoids mobile drawer duplicate)
const SEARCH_SELECTOR = '#search-input';

test('search: type in search bar, see filtered results', async ({ page }) => {
  await page.goto('/articles');

  const searchInput = page.locator(SEARCH_SELECTOR);
  await searchInput.click();
  // pressSequentially + Enter is more reliable across browsers than fill + debounce
  await searchInput.pressSequentially('engineering');
  await searchInput.press('Enter');

  await page.waitForURL(/\?q=engineering/);

  // Results should be visible (engineering articles exist in seed data)
  await expect(page.locator('main ul li').first()).toBeVisible();

  // Page heading changes to "Results for..." (first h1 in main = page heading)
  await expect(page.locator('main h1').first()).toContainText('Results for');
});

test('search: empty results show EmptyState with No results text', async ({ page }) => {
  await page.goto('/articles');

  const searchInput = page.locator(SEARCH_SELECTOR);
  await searchInput.click();
  await searchInput.pressSequentially('zzzznowaythisexists');
  await searchInput.press('Enter');

  await page.waitForURL(/\?q=zzzznowaythisexists/);

  // EmptyState has role="status" and contains "No results"
  const emptyState = page.getByRole('status');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('No results');
});

test('search: clear search with Escape restores full list', async ({ page }) => {
  await page.goto('/articles?q=engineering');

  // Focus and press Escape on the sidebar search input
  const searchInput = page.locator(SEARCH_SELECTOR);
  await searchInput.click();
  await searchInput.press('Escape');
  await page.waitForURL('/articles');

  // Full article list restored
  await expect(page.locator('main ul li').first()).toBeVisible();
  expect(await page.locator('main ul li').count()).toBeGreaterThanOrEqual(1);
});
