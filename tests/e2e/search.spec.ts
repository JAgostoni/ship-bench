import { test, expect } from '@playwright/test';

test('search returns results and highlights query', async ({ page }) => {
  // Insert article directly via Prisma to bypass auth
  const prisma = (await import('../../src/lib/prisma')).default;
  await prisma.article.create({
    data: { title: 'Test article', content: 'test content', status: 'DRAFT' },
  });
  await page.goto('http://localhost:3000/articles');
  // Wait for article cards to appear
  const articleCards = page.locator('[data-test-id="article-card"]');
  await expect(articleCards).toHaveCount(1);

  const searchInput = page.locator('input[placeholder="Search articles…"]');
  await searchInput.fill('test');
  // Wait for filtered results
  await expect(articleCards).toHaveCount(1);
  // Check highlight
  const highlighted = articleCards.locator('mark');
  await expect(highlighted).toContainText(/test/i);
});
