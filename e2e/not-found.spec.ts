// 404 page (architecture §8.2 secondary spec): a missing article id and an
// unknown route both show "Article not found" with a working recovery link.
import { expect, test } from "@playwright/test";

test("missing article id shows the not-found state with recovery", async ({
  page,
}) => {
  await page.goto("/articles/99999");
  await expect(
    page.getByRole("heading", { level: 1, name: "Article not found" }),
  ).toBeVisible();
  await expect(
    page.getByText("It may have been deleted, or the link is wrong."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to all articles" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Articles" }),
  ).toBeVisible();
});

test("unknown route shows the same not-found state", async ({ page }) => {
  await page.goto("/no/such/route");
  await expect(
    page.getByRole("heading", { level: 1, name: "Article not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to all articles" }),
  ).toBeVisible();
});
