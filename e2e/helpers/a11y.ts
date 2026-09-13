import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The accessibility **smoke** check from `architecture.md` §11.4.
 *
 * It is deliberately not the "full accessibility audit" the brief places outside
 * MVP scope: it catches a missing label, a missing landmark, or ARIA misuse on the
 * three primary routes, and nothing more. Colour contrast is switched off because
 * it is covered by the manual check in `design-spec.md` §9.1 — the automated
 * ratio calculator cannot see through the design tokens' `color-mix()` values and
 * would report false positives on the whole palette.
 *
 * **The `<title>` wait is not cosmetic.** Next.js streams the document title as part
 * of the metadata it flushes after the first shell, so on a slower engine (WebKit)
 * axe can run against a document whose `<title>` has not landed yet and report
 * `document-title` (serious). Waiting for a non-empty title analyzes the document
 * the user actually ends up with, which is the thing the rule is about.
 */
export async function expectNoA11yViolations(page: Page) {
  await expect.poll(() => page.evaluate(() => document.title.trim().length)).toBeGreaterThan(0);

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast']) // covered by the manual contrast check in §13.5
    .analyze();
  expect(violations).toEqual([]);
}
