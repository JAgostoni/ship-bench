import { test, expect } from '@playwright/test';

test.describe('Browse flow', () => {
  test('home page shows article cards', async ({ page }) => {
    await page.goto('/');

    // Verify article cards are rendered (seeded data has 3 published articles)
    await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();

    // Verify at least one article card is present
    const cards = page.locator('[data-testid="article-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('click article card navigates to detail page', async ({ page }) => {
    await page.goto('/');

    // Click the first article title link
    const firstCard = page.locator('[data-testid="article-card"]').first();
    await firstCard.locator('a').first().click();

    // Verify we're on an article detail page (has an h1 title and prose content)
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('.prose')).toBeVisible();
  });

  test('article detail has back link to home', async ({ page }) => {
    await page.goto('/articles/getting-started-with-the-knowledge-base');

    // Click "Back to articles" link (first one is in the header)
    await page.getByRole('link', { name: 'Back to articles' }).first().click();

    // Verify we're back on home page
    await expect(page).toHaveURL('/');
  });

  test('navigating to a nonexistent slug shows 404', async ({ page }) => {
    await page.goto('/articles/nonexistent-slug-12345');

    // Verify 404 content is shown
    await expect(page.getByText('Article not found')).toBeVisible();
  });

  test('sidebar categories are visible', async ({ page }) => {
    await page.goto('/');

    // Verify sidebar shows categories (narrow to the sidebar <nav>)
    const sidebar = page.locator('nav[aria-label="Sidebar navigation"]');
    await expect(sidebar.getByRole('link', { name: /^Guides/ })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /^Reference/ })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /^Policies/ })).toBeVisible();
  });
});