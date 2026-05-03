import { test, expect } from '@playwright/test';

test.describe('Browse → View Article Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="article-card"]');
  });

  test('seed loads and article list shows expected titles', async ({ page }) => {
    const onboardingCard = page.getByTestId('article-card').filter({ hasText: 'Onboarding Checklist' });
    const runbookCard = page.getByTestId('article-card').filter({ hasText: 'Engineering Runbook: Deployments' });
    await expect(onboardingCard).toBeVisible();
    await expect(runbookCard).toBeVisible();
  });

  test('clicking an article card navigates to detail page', async ({ page }) => {
    const card = page.getByTestId('article-card').filter({ hasText: 'Onboarding Checklist' });
    await card.click();
    await expect(page).toHaveURL(/\/articles\/onboarding-checklist/);
    await expect(page.getByRole('heading', { name: 'Onboarding Checklist', level: 1 }).first()).toBeVisible();
    await expect(page.getByText('Welcome! Here is everything you need to get started.')).toBeVisible();
  });

  test('clicking Back to articles returns to home', async ({ page }) => {
    const card = page.getByTestId('article-card').filter({ hasText: 'Onboarding Checklist' });
    await card.click();
    await page.getByRole('link', { name: /Back to articles/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Onboarding Checklist' })).toBeVisible();
  });

  test('visiting a nonexistent slug shows empty state', async ({ page }) => {
    await page.goto('/articles/does-not-exist-12345');
    await expect(page.getByRole('heading', { name: 'Article not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to articles/i })).toBeVisible();
  });
});