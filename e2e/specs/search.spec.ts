import { test, expect } from '@playwright/test';

test.describe('Search -> Select Result -> View Article', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="article-card"]');
  });

  test('type a known query, results update after debounce', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Search articles' });
    await searchInput.fill('onboarding');
    await expect(page.getByText(/results? for "onboarding"/i)).toBeVisible();
    await expect(page.getByTestId('article-card').filter({ hasText: 'Onboarding Checklist' })).toBeVisible();
  });

  test('clear search restores full list', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Search articles' });
    await searchInput.fill('onboarding');
    await expect(page.getByText(/results? for "onboarding"/i)).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();
    // After clearing, URL should go back to `/`
    await expect(page).toHaveURL('/');
    // Wait for article cards to reappear then assert a seeded article is back
    await page.waitForSelector('[data-testid="article-card"]');
    await expect(page.getByTestId('article-card').first()).toBeVisible();
  });

  test('search with no matches shows empty state', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Search articles' });
    await searchInput.fill('xyznonexistent123');
    await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible();
    await expect(page.getByText(/We couldn't find any articles matching/)).toBeVisible();
  });

  test('click a search result navigates to detail page', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Search articles' });
    await searchInput.fill('runbook');
    await expect(page.getByTestId('article-card').filter({ hasText: 'Engineering Runbook: Deployments' })).toBeVisible();
    await page.getByTestId('article-card').filter({ hasText: 'Engineering Runbook: Deployments' }).click();
    await expect(page).toHaveURL(/\/articles\/engineering-runbook-deployments/);
    await expect(page.getByRole('heading', { name: 'Engineering Runbook: Deployments', level: 1 }).first()).toBeVisible();
  });

  test('page load with ?q=query auto-executes search', async ({ page }) => {
    await page.goto('/?q=remote');
    await expect(page.getByText(/results? for "remote"/i)).toBeVisible();
    await expect(page.getByTestId('article-card').filter({ hasText: 'Remote Work Policy' })).toBeVisible();
  });
});