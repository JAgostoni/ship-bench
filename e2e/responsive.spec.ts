import { expect, test } from '@playwright/test';
import { resetDb } from './helpers/reset-db';

/**
 * The two non-functional journeys (`architecture.md` §11.4, `design-spec.md` §6.3).
 *
 * The viewports are set explicitly rather than inherited from the project, because
 * the assertion is about the **1024px breakpoint**: 834×1112 is below it (drawer)
 * and 1280×800 is above it (persistent sidebar). Relying on the project's own
 * viewport would make the tablet project (1080×810) silently skip the drawer half.
 *
 * Phone widths (360px) are deliberately absent — `design-spec.md` U2 and
 * `architecture.md` §16.2 support them but do not optimize for them, and
 * `backlog.md` B11 assigns that check to iteration 8's manual sweep.
 */
const TABLET = { width: 834, height: 1112 };
const DESKTOP = { width: 1280, height: 800 };

test.beforeEach(async ({ page }) => {
  await resetDb(page);
});

test('the sidebar collapses to a drawer below 1024px and persists above it', async ({ page }) => {
  // --- below 1024px: no sticky sidebar, a ☰ drawer instead -------------------
  await page.setViewportSize(TABLET);
  await page.goto('/');

  const sidebar = page.locator('aside').first();
  await expect(sidebar).toBeHidden();

  const opener = page.getByRole('button', { name: 'Open navigation' });
  await expect(opener).toBeVisible();

  await opener.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('navigation', { name: 'Main' })).toBeVisible();

  // The drawer traps focus: after opening, keyboard focus stays inside it.
  await expect
    .poll(async () =>
      drawer.evaluate((node) => node.contains(document.activeElement)).catch(() => false),
    )
    .toBe(true);

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const inside = await drawer.evaluate((node) => node.contains(document.activeElement));
    expect(inside, `focus escaped the drawer after Tab #${i + 1}`).toBe(true);
  }

  // And it closes on Escape.
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  // --- above 1024px: the persistent sidebar, no drawer ----------------------
  await page.setViewportSize(DESKTOP);
  await page.goto('/');

  await expect(page.locator('aside').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();
});

test('there is no horizontal overflow at either viewport', async ({ page }) => {
  for (const viewport of [TABLET, DESKTOP]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const overflow = await page.evaluate(() => {
      const element = document.scrollingElement ?? document.documentElement;
      return { scrollWidth: element.scrollWidth, innerWidth: window.innerWidth };
    });

    expect(
      overflow.scrollWidth,
      `overflow at ${viewport.width}×${viewport.height}: scrollWidth ${overflow.scrollWidth} > innerWidth ${overflow.innerWidth}`,
    ).toBeLessThanOrEqual(overflow.innerWidth + 1);
  }
});

test('the tablet header keeps "+ New article" as a labelled control', async ({ page }) => {
  await page.setViewportSize(TABLET);
  await page.goto('/');

  // At ≥768px the label is shown (`hidden md:inline`), so the primary action is
  // never an unlabelled icon-only control on a touch viewport (§6.6).
  const newArticle = page.getByRole('link', { name: 'New article' }).first();
  await expect(newArticle).toBeVisible();
  await expect(newArticle).toHaveAccessibleName('New article');
});
