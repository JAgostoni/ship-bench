// Iteration 8.1: the browser-side budgets — LCP and filter-chip interaction —
// measured against the 2,000-article dataset with the real app in a real browser
// (`architecture.md` §13.1).
//
// Run: `node scripts/perf-browser.cjs http://127.0.0.1:3200`
const { chromium } = require('@playwright/test');

const base = process.argv[2] ?? 'http://127.0.0.1:3200';
const RUNS = Number(process.env.PERF_RUNS ?? 10);

function p75(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1)];
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // ── LCP, browse route, localhost baseline ──────────────────────────────────
  const lcp = [];
  for (let i = 0; i < RUNS; i++) {
    await page.goto(base + '/', { waitUntil: 'load' });
    const value = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let last = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) last = entry.startTime;
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(last);
          }, 400);
        }),
    );
    lcp.push(value);
  }
  const lcp75 = p75(lcp);
  console.log(
    `LCP browse / (localhost)          p75 ${lcp75.toFixed(0).padStart(6)} ms  budget 1200  ${lcp75 < 1200 ? 'PASS' : 'FAIL'}`,
  );

  // ── Filter-chip interaction, perceived ─────────────────────────────────────
  // The click → commit signal is the chip's own `aria-current="page"` moving to the
  // clicked chip: the filter bar re-renders when the new server result set arrives,
  // which is exactly the moment the user sees the refinement land. `useTransition`
  // keeps the old list visible until then, so this is the perceived latency.
  const chipTimes = [];
  const chipLabels = ['Engineering', 'Product', 'People'];
  for (let i = 0; i < RUNS; i++) {
    await page.goto(base + '/', { waitUntil: 'load' });
    const label = chipLabels[i % chipLabels.length];
    const chip = page.locator('main button.kb-touch', { hasText: label }).first();
    const start = Date.now();
    await chip.click({ noWaitAfter: true });
    await page.waitForFunction(
      (text) => {
        const buttons = [...document.querySelectorAll('main button.kb-touch')];
        return buttons.some(
          (b) => b.textContent.includes(text) && b.getAttribute('aria-current') === 'page',
        );
      },
      label,
      { timeout: 5000 },
    );
    chipTimes.push(Date.now() - start);
  }
  const chip75 = p75(chipTimes);
  console.log(
    `Filter-chip interaction (perceived) p75 ${chip75.toFixed(0).padStart(6)} ms  budget  300  ${chip75 < 300 ? 'PASS' : 'FAIL'}`,
  );

  await browser.close();
})();
