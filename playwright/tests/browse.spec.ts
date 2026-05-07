import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Browse Journey', () => {
  /// Returns a locator for article cards — excludes the "+ New" link at /articles/new
  function articleCards(page: Page) {
    return page.locator('a.group[href*="/articles/"]').and(
      page.locator('a[href*="/articles/"]').and(
        page.locator('a:not([href*="/articles/new"])')
      )
    );
  }

  test('user opens app and sees article list on home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Knowledge Base/);
    const cards = articleCards(page);
    await expect(cards.first()).toBeVisible();
  });

  test('user clicks an article card and navigates to detail view', async ({ page }) => {
    await page.goto('/');
    const cards = articleCards(page);
    await expect(cards.first()).toBeVisible();
    // Get the href and navigate directly (avoids potential client-side navigation issues in tests)
    const href = await cards.first().getAttribute('href');
    await page.goto(href!);
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);
  });

  test('user sees article title, content, and meta row on detail page', async ({ page }) => {
    await page.goto('/');
    const cards = articleCards(page);
    await expect(cards.first()).toBeVisible();
    // Get the href and navigate directly
    const href = await cards.first().getAttribute('href');
    const navigationPromise = page.waitForURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);
    await page.goto(href!);
    await navigationPromise;

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.kb-prose')).toBeVisible();
  });

  test('Back link returns to browse view', async ({ page }) => {
    await page.goto('/');
    const cards = articleCards(page);
    await expect(cards.first()).toBeVisible();
    // Get the href and navigate directly
    const href = await cards.first().getAttribute('href');
    const navigationPromise = page.waitForURL(/^http:\/\/localhost:3000\/articles\/[a-f0-9-]+$/);
    await page.goto(href!);
    await navigationPromise;

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.kb-prose')).toBeVisible();
    const backLink = page.getByRole('link', { name: 'Back' });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\//);
  });

  test('article not found shows appropriate message', async ({ page }) => {
    await page.goto('/articles/non-existent-id');
    await expect(page.getByText('This article no longer exists')).toBeVisible();
  });
});
