import { test, expect } from '@playwright/test';

test('smoke test - home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Knowledge Base', exact: true })).toBeVisible();
});
