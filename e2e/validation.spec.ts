// Validation error display (architecture §8.2 secondary spec): an empty
// submit shows both required-field messages with focus on the title field;
// fixing the fields saves successfully.
import { expect, test } from "@playwright/test";
import { resetToSeed } from "./fixtures";

test.beforeEach(() => {
  resetToSeed();
});

test("empty submit shows field errors, fixing them saves", async ({ page }) => {
  await page.goto("/articles/new");
  await page.getByRole("button", { name: "Save article" }).click();

  // Exact copy from design §2.3; focus lands on the first invalid field.
  await expect(page.getByText("Title is required")).toBeVisible();
  await expect(page.getByText("Content is required")).toBeVisible();
  await expect(page.getByLabel("Title")).toBeFocused();
  await expect(page.getByLabel("Title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  // Fix and save succeeds.
  await page.getByLabel("Title").fill("Printer setup");
  await page.getByLabel("Content").fill("Plug it in. Pray.");
  await page.getByRole("button", { name: "Save article" }).click();
  await expect(page).toHaveURL(/\/articles\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Printer setup" }),
  ).toBeVisible();
});
