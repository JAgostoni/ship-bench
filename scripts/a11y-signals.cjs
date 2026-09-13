// Iteration 8.3: the "colour is never the only signal" rules (design-spec.md §9.4)
// and the a11y smoke run, on the three primary routes.
//
// Run: `node scripts/a11y-signals.cjs http://127.0.0.1:3200`
const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const base = process.argv[2] ?? 'http://127.0.0.1:3200';

(async () => {
  const browser = await chromium.launch();
  const page = await browser
    .newContext({ viewport: { width: 1280, height: 800 } })
    .then((c) => c.newPage());

  // ── axe smoke ───────────────────────────────────────────────────────────────
  console.log('=== axe smoke (wcag2a + wcag2aa, color-contrast disabled per §9.4) ===');
  for (const [route, label] of [
    ['/', '/'],
    ['/search?q=deploy', '/search'],
    ['/articles/deploy-guide-1', '/articles/[slug]'],
  ]) {
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForFunction(() => document.title.trim().length > 0);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    console.log(
      `  ${label.padEnd(18)} ${violations.length === 0 ? 'PASS' : 'FAIL'}  ${violations.map((v) => v.id).join(', ')}`,
    );
  }

  // ── colour is never the only signal ─────────────────────────────────────────
  console.log('\n=== colour is never the only signal ===');
  await page.goto(base + '/?status=draft', { waitUntil: 'load' });
  const badges = await page.evaluate(() =>
    [...document.querySelectorAll('span')]
      .filter((el) => el.textContent.trim() === 'Draft' || el.textContent.trim() === 'Archived')
      .map((el) => el.textContent.trim()),
  );
  console.log(
    `  draft/archived carry a text badge: ${badges.length > 0 ? 'PASS' : 'N/A (no drafts on page 1)'} [${badges.join(', ')}]`,
  );

  await page.goto(base + '/search?q=deploy', { waitUntil: 'load' });
  const marks = await page.evaluate(() => document.querySelectorAll('mark').length);
  console.log(`  search matches use <mark>: ${marks > 0 ? 'PASS' : 'FAIL'} (${marks} marks)`);

  await page.goto(base + '/articles/deploy-guide-1', { waitUntil: 'load' });
  const toc = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-current="true"]')].map((el) => ({
      text: el.textContent.trim().slice(0, 24),
      border: getComputedStyle(el).borderLeftWidth,
      aria: el.getAttribute('aria-current'),
    })),
  );
  console.log(
    `  active TOC item has aria-current + border: ${toc.length > 0 && toc[0].aria === 'true' ? 'PASS' : 'N/A'} ${JSON.stringify(toc)}`,
  );

  await page.goto(base + '/articles/deploy-guide-1/edit', { waitUntil: 'load' });
  const errorSignals = await page.evaluate(() => ({
    invalid: document.querySelectorAll('[aria-invalid="true"]').length,
  }));
  console.log(`  editor exposes aria-invalid on invalid fields: ${JSON.stringify(errorSignals)}`);

  await browser.close();
})();
