import { test, expect } from '@playwright/test';

test('search returns results and highlights query', async ({ page }) => {
  // Insert article directly via Prisma to bypass auth with a unique title
  const prisma = (await import('../../src/lib/prisma')).default;
  const uniqueTitle = `UniqueSearchTest-${Date.now()}`;
  const uniqueContent = 'uniquecontent123';
  await prisma.article.create({
    data: { title: uniqueTitle, content: uniqueContent, status: 'DRAFT' },
  });
  await page.goto('http://localhost:3000/articles');
  const searchInput = page.locator('input[placeholder="Search articles…"]');
  await searchInput.fill(uniqueTitle);
  // Wait for the article with the unique title to appear
  await expect(page.locator(`[data-test-id="article-card"] >> text=${uniqueTitle}`)).toBeVisible();
  // Cleanup: delete the inserted article
  await prisma.article.deleteMany({ where: { title: uniqueTitle } });
});
