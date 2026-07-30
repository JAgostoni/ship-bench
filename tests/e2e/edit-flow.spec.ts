import { test, expect } from '@playwright/test';

// This spec assumes an article exists with a known title.
const originalTitle = `EditTest ${Date.now()}`;
const updatedTitle = `${originalTitle} Updated`;

test('edit existing article', async ({ page }) => {
  // Create article via API or direct DB insert (simplified here)
  const prisma = (await import('../../src/lib/prisma')).default;
  const article = await prisma.article.create({
    data: { title: originalTitle, content: 'Original content', status: 'DRAFT' },
  });
  await page.goto(`http://localhost:3000/articles/${article.id}/edit`);
  await page.fill('input[name="title"]', updatedTitle);
  await page.click('button[type="submit"]');
  // Verify changes in list
  await page.goto('http://localhost:3000/articles');
  await expect(page.locator(`[data-test-id="article-card"] >> text=${updatedTitle}`)).toBeVisible();
  // Cleanup
  await prisma.article.delete({ where: { id: article.id } });
});
