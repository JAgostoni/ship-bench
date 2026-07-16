import { test, expect } from "@playwright/test";

/**
 * Critical MVP journey: browse → search → edit (+ create draft).
 * Architecture §11.2 / Iteration 6 T6.5.
 */
test.describe.configure({ mode: "serial" });

test.describe("article journey", () => {
  test("browse home list and open first article", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Articles", level: 1 }),
    ).toBeVisible();

    // Article rows only (exclude filter rail links)
    const firstArticle = page.locator('main a[href^="/articles/"]').first();
    await expect(firstArticle).toBeVisible();
    const listTitle = (await firstArticle.locator("h2").textContent())?.trim();
    expect(listTitle).toBeTruthy();

    await firstArticle.click();
    await expect(page).toHaveURL(/\/articles\/[^/]+$/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".prose-article")).toBeVisible();
  });

  test("search finds seeded onboarding content", async ({ page }) => {
    await page.goto("/");

    const search = page.locator("#header-search");
    await expect(search).toBeVisible();
    await search.fill("onboarding");

    // Typeahead (debounced) or full search page both satisfy the brief
    const typeaheadHit = page
      .locator('[role="listbox"] a, [role="option"] a')
      .filter({ hasText: /onboarding/i })
      .first();
    const typeaheadVisible = await typeaheadHit
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (typeaheadVisible) {
      await expect(typeaheadHit).toBeVisible();
      return;
    }

    await search.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=onboarding/);
    await expect(page.getByText(/onboarding/i).first()).toBeVisible();
  });

  test("edit article title and save", async ({ page }) => {
    const unique = `E2E Edited ${Date.now()}`;

    await page.goto("/articles/how-we-deploy");
    await expect(
      page.getByRole("heading", { level: 1, name: /deploy/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/articles\/how-we-deploy\/edit/);

    const titleInput = page.locator("#title");
    await expect(titleInput).toBeVisible();
    await titleInput.fill(unique);

    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/articles\/how-we-deploy$/);
    await expect(
      page.getByRole("heading", { level: 1, name: unique }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("create draft article and see it under drafts filter", async ({
    page,
  }) => {
    const stamp = Date.now();
    const title = `E2E Draft ${stamp}`;
    const slug = `e2e-draft-${stamp}`;

    await page.goto("/articles/new");
    await expect(
      page.getByRole("heading", { name: "Create article" }),
    ).toBeVisible();

    await page.locator("#title").fill(title);
    await page.locator("#slug").fill(slug);

    // TipTap contenteditable
    const editor = page.locator('[aria-label="Article content"]');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await page.keyboard.type(
      "This is an end-to-end draft body used for the critical journey.",
    );

    await page.getByRole("radio", { name: "Draft" }).check();
    await page.getByRole("button", { name: "Save article" }).click();

    await expect(page).toHaveURL(new RegExp(`/articles/${slug}$`), {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();

    // Draft should appear when status filter includes drafts
    await page.goto("/?status=DRAFT");
    await expect(
      page.locator(`main a[href="/articles/${slug}"]`),
    ).toBeVisible({ timeout: 10_000 });
  });
});
