// Iteration 8.10: the acceptance check from `architecture.md` §18, run as a human
// would run it — browse, search, edit, reload, and see the change persisted — plus
// the "expected first-run result" from the README.
//
// Run against the dev server: `node scripts/acceptance-check.cjs http://127.0.0.1:3000`
const { chromium } = require('@playwright/test');

const base = process.argv[2] ?? 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch();
  const page = await browser
    .newContext({ viewport: { width: 1280, height: 900 } })
    .then((c) => c.newPage());
  const results = [];
  const check = (label, ok, detail = '') => {
    results.push({ label, ok });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  };

  // ── README's expected first-run result ─────────────────────────────────────
  console.log('=== Expected first-run result (README) ===');
  await page.goto(base + '/', { waitUntil: 'load' });
  // The sidebar renders the four real categories plus an "Uncategorized" row when at
  // least one published article has no category (the seed has exactly one), so the
  // README's "4 categories" means four `categories` rows, not four sidebar links.
  const sidebar = await page.$$eval('nav[aria-label="Main"] a[href^="/categories/"]', (els) =>
    els.map((el) => ({ href: el.getAttribute('href'), text: el.textContent.trim() })),
  );
  const realCategories = sidebar.filter((row) => row.href !== '/categories/uncategorized');
  const uncategorized = sidebar.filter((row) => row.href === '/categories/uncategorized');
  check('browse shows 4 categories', realCategories.length === 4, `found ${realCategories.length}`);
  check(
    'the uncategorized row is present only because one seeded article has no category',
    uncategorized.length === 1,
    'expected exactly 1, per the seed fixture',
  );

  const countLine =
    (await page
      .locator('main p[role="status"]')
      .filter({ hasText: 'published' })
      .first()
      .textContent()) ?? '';
  check('browse shows "7 published"', countLine.includes('7 published'), countLine.trim());

  await page.goto(base + '/search?q=deploy', { waitUntil: 'load' });
  const rows = await page.locator('main a[href^="/articles/"]').count();
  check('searching `deploy` returns 3 results', rows === 3, `found ${rows}`);

  await page.goto(base + '/articles/deploying-the-api-to-production', { waitUntil: 'load' });
  const render = await page.evaluate(() => ({
    h2: document.querySelectorAll('.prose h2').length,
    table: document.querySelectorAll('.prose table').length,
    code: document.querySelectorAll('.prose pre code').length,
    literalHashes: /^##\s/m.test(document.querySelector('.prose')?.textContent ?? ''),
    literalTable: (document.querySelector('.prose')?.textContent ?? '').includes('| ---'),
  }));
  check(
    'article body renders Markdown as real elements',
    render.h2 > 0 && render.table > 0 && render.code > 0,
    JSON.stringify(render),
  );
  check('literal Markdown syntax is not shown', !render.literalTable && !render.literalHashes);

  // ── The acceptance criterion: browse → search → edit → reload ──────────────
  console.log('\n=== Acceptance: browse → search → edit → reload ===');
  const marker = `Acceptance check ${Date.now()}`;

  await page.goto(base + '/search?q=deploy', { waitUntil: 'load' });
  await page.locator('main a[href^="/articles/"]').first().click();
  await page.waitForURL(/\/articles\//);
  const slug = new URL(page.url()).pathname.split('/').pop();
  check('open an article from search results', Boolean(slug), `/${slug}`);

  await page.goto(`${base}/articles/${slug}/edit`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="markdown-editor"] textarea', { timeout: 15000 });

  const body = page.getByRole('textbox', { name: 'Article body' });
  const original = await body.inputValue();
  await body.fill(`${original}\n\n<!-- ${marker} -->`);
  await page.locator('#article-save').click();
  await page.waitForURL(new RegExp(`/articles/${slug}$`), { timeout: 20000 });
  check('save redirects back to the article', page.url().endsWith(`/articles/${slug}`));

  await page.reload({ waitUntil: 'load' });
  const persisted = await page.evaluate((text) => document.body.textContent.includes(text), marker);
  check('the change is persisted after a full reload', persisted);

  // Restore the article so the seeded dataset is unchanged.
  await page.goto(`${base}/articles/${slug}/edit`, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="markdown-editor"] textarea', { timeout: 15000 });
  const current = await page.getByRole('textbox', { name: 'Article body' }).inputValue();
  await page
    .getByRole('textbox', { name: 'Article body' })
    .fill(current.replace(`\n\n<!-- ${marker} -->`, ''));
  await page.locator('#article-save').click();
  await page.waitForURL(new RegExp(`/articles/${slug}$`), { timeout: 20000 });
  check('restored the seeded article content', true);

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECK(S) FAILED`}`,
  );
  await browser.close();
  process.exit(failed.length === 0 ? 0 : 1);
})();
