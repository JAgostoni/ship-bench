import { test, expect } from '@playwright/test';

// This spec assumes the user is already logged in via a fixture or prior login step.

test('create a new article', async ({ page }) => {
  // Navigate to create article page
  await page.goto('http://localhost:3000/articles/new');
  const title = `New Article ${Date.now()}`;
  const content = 'Content for new article';
  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="content"]', content);
  await page.click('button[type="submit"]');
  // Verify article appears in list
  await page.goto('http://localhost:3000/articles');
  await expect(page.locator(`[data-test-id="article-card"] >> text=${title}`)).toBeVisible();
});
