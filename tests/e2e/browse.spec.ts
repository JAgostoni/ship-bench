import { test, expect } from '@playwright/test';

test('browse article list shows at least one article', async ({ page }) => {
  await page.goto('http://localhost:3000/articles');
  const cards = page.locator('[data-test-id="article-card"]');
  await expect(cards).toHaveCountGreaterThan(0);
});
