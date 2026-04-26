import { test, expect } from '@playwright/test';

test('Journey 1: Browse and read an article', async ({ page }) => {
  await page.goto('/');

  // Verify header exists
  await expect(page.getByRole('link', { name: 'Knowledge Base', exact: true })).toBeVisible();

  const firstArticle = page.locator('a[class*="articleCard"]').first();
  await expect(firstArticle).toBeVisible();

  const articleTitle = await firstArticle.locator('h2').textContent();
  
  await firstArticle.click();

  await expect(page.locator('h1').filter({ hasText: articleTitle || undefined }).first()).toBeVisible();

  const proseContent = page.locator('div[class*="prose"]');
  await expect(proseContent).toBeVisible();
});