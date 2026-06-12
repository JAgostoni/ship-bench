// The brief-required critical journey (architecture §8.2):
// browse → search → open → edit → save → search finds the updated title
// (which proves the FTS triggers fire on update).
import { expect, test } from "@playwright/test";
import { resetToSeed } from "./fixtures";

test.beforeEach(() => {
  resetToSeed();
});

test("critical journey: browse → search → edit", async ({ page }) => {
  // 1. Home shows the seeded articles: count plus a known title.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Articles" }),
  ).toBeVisible();
  await expect(page.getByText("12 articles")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Deploy checklist/ }),
  ).toBeVisible();

  // 2. Type a query in the header search box → dropdown shows the match.
  const searchBox = page.getByRole("combobox", { name: "Search articles" });
  await searchBox.fill("deploy checklist");
  const match = page.getByRole("option", { name: /Deploy checklist/ });
  await expect(match).toBeVisible();

  // 3. Open the result → article detail renders.
  await match.click();
  await expect(page).toHaveURL(/\/articles\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Deploy checklist" }),
  ).toBeVisible();
  await expect(page.getByText("Rollbacks are cheap")).toBeVisible();

  // 4. Click Edit → change title and body → Save.
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/articles\/\d+\/edit$/);
  await page.getByLabel("Title").fill("Deploy checklist (revised)");
  await page
    .getByLabel("Content")
    .fill("# Revised steps\n\nShip it **carefully**, then watch the graphs.");
  await page.getByRole("button", { name: "Save article" }).click();

  // 5. Detail shows the updated content.
  await expect(page).toHaveURL(/\/articles\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Deploy checklist (revised)" }),
  ).toBeVisible();
  await expect(
    page.getByText("Ship it carefully, then watch the graphs."),
  ).toBeVisible();

  // 6. Search for the new title → found (FTS triggers fire on update).
  await searchBox.fill("revised");
  await expect(
    page.getByRole("option", { name: /Deploy checklist \(revised\)/ }),
  ).toBeVisible();
});
