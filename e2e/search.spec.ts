import { test, expect } from '@playwright/test';

test.describe('Search flow', () => {
  test('search finds matching articles', async ({ page }) => {
    await page.goto('/');

    // Search bar has desktop and mobile variants; use .first() to avoid strict mode
    const searchInput = page.locator('[data-testid="search-input"]').first();
    await searchInput.fill('Getting Started');
    await searchInput.press('Enter');

    // Verify URL has query param (encodeURIComponent uses %20 for spaces)
    await expect(page).toHaveURL(/q=Getting%20Started/);

    // Verify results info banner
    await expect(page.getByText('Results for')).toBeVisible();

    // Verify at least one result
    await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
  });

  test('search with no results shows empty state', async ({ page }) => {
    await page.goto('/?q=xyznonexistent123');

    // Verify empty search results state
    await expect(page.getByText(/No results for/)).toBeVisible();

    // Verify "Browse all articles" link (use role-based selector)
    await expect(page.getByRole('button', { name: 'Browse all articles' })).toBeVisible();
  });

  test('search from article detail page navigates to home', async ({ page }) => {
    await page.goto('/articles/getting-started-with-the-knowledge-base');

    // Use the header search bar (desktop variant - first one visible)
    const searchInput = page.locator('[data-testid="search-input"]').first();
    await searchInput.fill('API');
    await searchInput.press('Enter');

    // Verify we navigated to home with search results
    await expect(page).toHaveURL(/\/\?q=API/);
    await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
  });

  test('clear search removes results', async ({ page }) => {
    await page.goto('/?q=Getting');

    // Click clear button (first one is the desktop variant)
    await page.locator('[data-testid="search-clear"]').first().click();

    // Verify we're back on home without query
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Results for')).not.toBeVisible();
  });

  test('empty query shows home page', async ({ page }) => {
    await page.goto('/?q=');

    // Verify we see the home page (no search banner)
    await expect(page.getByText('Results for')).not.toBeVisible();
    await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
  });
});