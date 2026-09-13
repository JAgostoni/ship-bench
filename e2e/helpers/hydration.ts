import { expect, type Page } from '@playwright/test';

/**
 * Waits until React has hydrated the document.
 *
 * **Why this is necessary rather than defensive.** Next.js streams server-rendered
 * HTML first, so a page can be visually complete — every heading, link, and input
 * present — while no event handler is attached yet. A `fill()` in that window
 * writes to the DOM, and when React then hydrates it restores the value it believes
 * is correct and the typed text is silently discarded: no error, no navigation.
 * Chromium hydrates fast enough that the race is invisible; WebKit needs long
 * enough that it is deterministic, which is why only the tablet project failed.
 *
 * It waits on React's own bookkeeping — the `__reactFiber$…` key React attaches to
 * a node it has hydrated — rather than on a fixed timeout, so it is not another
 * sleep to tune. `page.waitForFunction` re-evaluates until the predicate is true,
 * and the assertion timeout turns a genuine hydration failure into a clear error
 * instead of a mystery timeout later in the test.
 */
export async function waitForHydration(page: Page, selector = 'body'): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((target) => {
          // React attaches `__reactFiber$…`/`__reactProps$…` keys to a DOM node as it
          // hydrates it. Their presence is the signal that event handlers are live.
          const node = document.querySelector(target);
          if (!node) return false;
          return Object.keys(node).some((key) => key.startsWith('__reactFiber$'));
        }, selector),
      {
        message:
          `React never hydrated \`${selector}\`. The client bundle may be blocked — check ` +
          '`allowedDevOrigins` in next.config.ts, which Next.js 16 uses to permit the ' +
          'dev server to serve client assets to a different origin (Playwright uses 127.0.0.1).',
        timeout: 15_000,
      },
    )
    .toBe(true);
}
