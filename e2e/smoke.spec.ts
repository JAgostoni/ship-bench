import { test, expect } from "@playwright/test";

test("home loads with shell landmarks", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.ok()).toBeTruthy();

  await expect(page.getByRole("link", { name: "Knowledge Base" })).toBeVisible();
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("#header-search")).toBeVisible();
  await expect(page.getByRole("link", { name: "New article" })).toBeVisible();
});
