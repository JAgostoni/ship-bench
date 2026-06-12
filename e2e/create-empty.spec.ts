// Create-from-empty-state (architecture §8.2 secondary spec): zero-article
// empty state → "Create your first article" → fill → save → detail; home
// lists the new article. State is restored for the specs that follow.
import { expect, test } from "@playwright/test";
import { resetToSeed, wipeArticles } from "./fixtures";

test.beforeEach(() => {
  wipeArticles();
});

test.afterAll(() => {
  resetToSeed();
});

test("create the first article from the empty state", async ({ page }) => {
  // Empty DB → "No articles yet" replaces the grid.
  await page.goto("/");
  await expect(page.getByText("0 articles")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No articles yet" }),
  ).toBeVisible();

  // CTA → new-article editor.
  await page.getByRole("link", { name: "Create your first article" }).click();
  await expect(page).toHaveURL("/articles/new");

  // Fill → save → detail page for the new article.
  await page.getByLabel("Title").fill("Welcome to the team KB");
  await page
    .getByLabel("Content")
    .fill("## Start here\n\nThis is the **first** article.");
  await page.getByRole("button", { name: "Save article" }).click();
  await expect(page).toHaveURL(/\/articles\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome to the team KB" }),
  ).toBeVisible();
  await expect(page.getByText("This is the first article.")).toBeVisible();

  // Home now lists it.
  await page.goto("/");
  await expect(page.getByText("1 article", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Welcome to the team KB/ }),
  ).toBeVisible();
});
