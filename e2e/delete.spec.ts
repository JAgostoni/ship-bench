// Delete with confirm (architecture §8.2 secondary spec): dialog appears,
// Cancel keeps the article, confirming deletes it — gone from the home list
// and from search (FTS delete trigger).
import { expect, test } from "@playwright/test";
import { resetToSeed } from "./fixtures";

test.beforeEach(() => {
  resetToSeed();
});

test("delete an article behind the confirm dialog", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /VPN setup/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "VPN setup" }),
  ).toBeVisible();

  // Cancel keeps it.
  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “VPN setup”?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("This permanently deletes the article."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "VPN setup" }),
  ).toBeVisible();

  // Delete → confirm → redirected home; the article is gone from the list.
  await page.getByRole("button", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("11 articles")).toBeVisible();
  await expect(page.getByRole("link", { name: /VPN setup/ })).toHaveCount(0);

  // Gone from search too. Other seed articles mention "VPN" in their bodies,
  // so assert on result titles rather than on an empty result list.
  const res = await request.get("/api/search?q=VPN%20setup");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { results: Array<{ title: string }> };
  expect(body.results.map((r) => r.title)).not.toContain("VPN setup");
});
