import { test, expect } from '@playwright/test';

// Assuming a test user exists in the test DB
const testUser = {
  email: 'test@example.com',
  password: 'Password123!',
};

test('user can log in', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  // Expect redirect to dashboard or articles page
  await expect(page).toHaveURL(/.*\/articles/);
  await expect(page.locator('text=Logout')).toBeVisible();
});
