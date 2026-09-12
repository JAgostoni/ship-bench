// Iteration 4 acceptance checks against the production build.
//
// Every assertion here maps to a line in `docs/iterations/iteration-4.md`'s
// Definition of done or to an explicit row of `docs/design-spec.md`. The strings
// are copied from the source files rather than retyped, so an escaped apostrophe
// cannot produce a false failure.
const { chromium } = require('playwright');

const BASE = 'http://localhost:3400';

const failures = [];
function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures.push(label);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ---- browse (DoD 1) ----------------------------------------------------
  let res = await page.goto(`${BASE}/`, { waitUntil: 'load' });
  // The list streams in after the shell, so wait for the first card before
  // counting anything.
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  check('GET / is 200', res.status() === 200);
  check('browse h1 is "Articles"', (await page.locator('h1').innerText()) === 'Articles');
  check('browse renders 7 published cards', (await page.locator('main h3').count()) === 7);
  check(
    'no draft card is rendered',
    (await page.locator('main h3').filter({ hasText: 'Draft:' }).count()) === 0,
  );
  check(
    'drafts excluded by default',
    (await page.getByText('Draft: Q1 Planning Notes').count()) === 0,
  );
  check(
    'count line shows the visible count',
    (await page.locator('main p[role="status"]').innerText()).startsWith('7 published'),
  );
  check(
    'sidebar lists 4 categories + All articles + Uncategorized',
    (await page.locator('aside nav a').count()) === 6,
  );
  check(
    'the card row is one anchor with no nested link',
    (await page.locator('main a[href^="/articles/"] h3').count()) === 7 &&
      (await page.locator('main a[href^="/articles/"] a').count()) === 0,
  );

  // ---- detail (DoD 2) ----------------------------------------------------
  res = await page.goto(`${BASE}/articles/deploying-the-api-to-production`, { waitUntil: 'load' });
  check('GET detail is 200', res.status() === 200);
  check(
    'detail h1 is the article title',
    (await page.locator('h1').innerText()) === 'Deploying the API to Production',
  );
  check('markdown h2 rendered', (await page.locator('article h2').count()) === 7);
  check('GFM table rendered', (await page.locator('article table').count()) === 1);
  check(
    'GFM task-list checkboxes rendered',
    (await page.locator('article input[type="checkbox"]').count()) === 6,
  );
  check(
    'no literal "##" reached the page',
    !(await page.locator('article').innerText()).includes('##'),
  );
  check('article body uses prose', (await page.locator('article .prose').count()) === 1);
  check(
    'breadcrumb is a labelled ordered list',
    (await page.locator('nav[aria-label="Breadcrumb"] ol').count()) === 1,
  );
  check(
    'draft/archived badge absent for a published article',
    (await page.locator('article h1 ~ span').filter({ hasText: 'Published' }).count()) === 0,
  );

  // ---- TOC (DoD: "working TOC") -----------------------------------------
  const stickyToc = page.locator('nav[aria-label="On this page"]');
  await stickyToc.waitFor({ state: 'visible', timeout: 10_000 });
  check('sticky TOC visible at 1280px', await stickyToc.isVisible());
  check('sticky TOC lists 7 headings', (await stickyToc.locator('a').count()) === 7);
  check(
    'TOC anchors match rendered heading ids',
    await page.evaluate(() => {
      const links = [...document.querySelectorAll('nav[aria-label="On this page"] a')];
      return links.every((a) => {
        const id = a.getAttribute('href')?.slice(1);
        return id ? document.getElementById(id) !== null : false;
      });
    }),
  );
  const inlineToc = page.locator('details').filter({ hasText: 'On this page' });
  check(
    'inline TOC hidden at 1280px',
    (await inlineToc.count()) === 0 || !(await inlineToc.first().isVisible()),
  );

  // ---- history (DoD: "history section") --------------------------------
  const history = page.locator('article details').nth(1);
  check('history is collapsed by default', (await history.getAttribute('open')) === null);
  check(
    'history header reads "History (3 revisions)"',
    (await history.locator('summary').innerText()).includes('History (3 revisions)'),
  );

  // ---- not found (DoD 3) -------------------------------------------------
  res = await page.goto(`${BASE}/articles/nope-not-here`, { waitUntil: 'load' });
  // The not-found UI streams in after the shell, so wait for its heading instead
  // of reading the DOM the moment `load` fires.
  await page
    .getByRole('heading', { level: 2, name: /find that article/ })
    .waitFor({ timeout: 10_000 });
  const expectedTitle = "We couldn't find that article.";
  const notFoundText = await page.getByRole('main').innerText();
  check(
    'unknown slug renders the article-specific 404 title',
    notFoundText.includes(expectedTitle),
  );
  check(
    'article 404 renders its exact description',
    notFoundText.includes('It may have been archived or the link may be wrong.'),
  );
  check(
    'article 404 is not the generic 404',
    !notFoundText.includes("We couldn't find that page."),
  );
  check(
    'article 404 offers both actions',
    (await page.getByRole('link', { name: 'Browse all articles' }).count()) === 1 &&
      (await page.getByRole('link', { name: 'Search' }).count()) === 1,
  );
  check('article 404 keeps the shell usable', (await page.locator('aside nav').count()) === 1);

  // The root 404 catches unmatched URLs and composes the shell directly, so its
  // landmark structure needs its own assertion.
  res = await page.goto(`${BASE}/totally-missing`, { waitUntil: 'load' });
  await page
    .getByRole('heading', { level: 2, name: /find that page/ })
    .waitFor({ timeout: 10_000 });
  check('unmatched URL returns 404', res.status() === 404);
  check('root 404 has exactly one header', (await page.locator('header').count()) === 1);
  check('root 404 has exactly one main', (await page.locator('main').count()) === 1);
  check('root 404 has exactly one footer', (await page.locator('footer').count()) === 1);
  check('root 404 keeps the sidebar', await page.locator('aside').isVisible());
  check(
    'root 404 offers browse and search',
    (await page.getByRole('link', { name: 'Browse all articles' }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Search' }).count()) === 1,
  );

  // ---- error boundary (DoD 6) -------------------------------------------
  // The error boundary was verified against a temporary throwing route that was
  // then deleted (see `docs/iteration-4-summary.md` §5): it rendered inside the
  // shell, showed `Something went wrong loading this page.`, exposed a numeric
  // `Reference: {digest}`, offered `Try again` and `Go to all articles`, and leaked
  // no stack trace. It is not re-checked here because no shipped route throws on
  // purpose, and adding one would ship a broken page.

  // ---- health (DoD 11) --------------------------------------------------
  const health = await page.request.get(`${BASE}/api/health`);
  const body = await health.json();
  check('health responds 200', health.status() === 200);
  check('health reports a reachable database', body.database.reachable === true);
  check('health reports the real article count', body.database.articleCount === 9);
  check('health reports the migration tag', body.database.migration === '0000_init');
  check('health reports uptime', typeof body.uptimeSeconds === 'number');

  // ---- shell + responsive (DoD 7, 10) -----------------------------------
  const shell = await ctx.newPage();
  await shell.goto(`${BASE}/`, { waitUntil: 'load' });
  check('exactly one header', (await shell.locator('header').count()) === 1);
  check('exactly one main', (await shell.locator('main').count()) === 1);
  check('exactly one footer', (await shell.locator('footer').count()) === 1);
  check('exactly one h1', (await shell.locator('h1').count()) === 1);
  check(
    'sidebar nav is labelled "Main"',
    (await shell.locator('nav[aria-label="Main"]').count()) === 1,
  );
  check(
    'header is sticky',
    (await shell.locator('body > div > header').evaluate((el) => getComputedStyle(el).position)) ===
      'sticky',
  );
  check(
    'sidebar is sticky and has its own scroll',
    await shell.locator('aside').evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.position === 'sticky' && cs.overflowY === 'auto';
    }),
  );
  check(
    'no global max-w-screen wrapper around the shell',
    (await shell.locator('body > div.w-full.flex > div.max-w-screen-2xl').count()) === 0,
  );

  // ---- 1024px: sidebar stays, drawer hidden ----------------------------
  const mid = await b.newContext({ viewport: { width: 1024, height: 900 } });
  const midPage = await mid.newPage();
  await midPage.goto(`${BASE}/`, { waitUntil: 'load' });
  check('1024px: sidebar visible', await midPage.locator('aside').isVisible());
  check(
    '1024px: hamburger hidden',
    !(await midPage.getByRole('button', { name: 'Open navigation' }).isVisible()),
  );
  await mid.close();

  // ---- 834px: drawer traps focus, Escape closes ------------------------
  const tablet = await b.newContext({ viewport: { width: 834, height: 1112 } });
  const tabletPage = await tablet.newPage();
  await tabletPage.goto(`${BASE}/`, { waitUntil: 'load' });
  check('834px: sidebar hidden', !(await tabletPage.locator('aside').isVisible()));
  const hamburger = tabletPage.getByRole('button', { name: 'Open navigation' });
  check('834px: hamburger visible and labelled', await hamburger.isVisible());
  check(
    '834px: hamburger is at least 40x40',
    await hamburger.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width >= 40 && r.height >= 40;
    }),
  );
  await hamburger.click();
  await tabletPage.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
  check('834px: drawer opens as a dialog', (await tabletPage.getByRole('dialog').count()) === 1);
  check(
    '834px: drawer exposes the category list',
    (await tabletPage.locator('[role="dialog"] nav[aria-label="Main"]').count()) === 1 &&
      (await tabletPage.locator('[role="dialog"] nav a').count()) >= 5,
  );
  await tabletPage.keyboard.press('Escape');
  await tabletPage.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 });
  check('834px: Escape closes the drawer', (await tabletPage.getByRole('dialog').count()) === 0);
  check(
    '834px: focus returns to the hamburger',
    (await tabletPage.evaluate(() => document.activeElement?.getAttribute('aria-label'))) ===
      'Open navigation',
  );
  check(
    '834px: "+ New article" stays a labelled button',
    await tabletPage
      .getByRole('link', { name: /New article/ })
      .first()
      .isVisible(),
  );
  await tablet.close();

  // ---- 360px: no horizontal overflow (DoD 10) --------------------------
  const phone = await b.newContext({ viewport: { width: 360, height: 800 } });
  const phonePage = await phone.newPage();
  for (const url of [
    '/',
    '/articles/deploying-the-api-to-production',
    '/articles/nope-not-here',
    '/totally-missing',
  ]) {
    await phonePage.goto(`${BASE}${url}`, { waitUntil: 'load' });
    check(
      `360px: no horizontal overflow on ${url}`,
      await phonePage.evaluate(
        () => document.scrollingElement.scrollWidth <= window.innerWidth + 1,
      ),
    );
  }
  await phone.close();

  // ---- a11y: skip link is the first tab stop (DoD 8) --------------------
  const a11y = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const a11yPage = await a11y.newPage();
  await a11yPage.goto(`${BASE}/`, { waitUntil: 'load' });
  await a11yPage.keyboard.press('Tab');
  check(
    'skip link is the first tab stop and targets #main',
    await a11yPage.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      return el.getAttribute('href') === '#main' || el.textContent?.trim() === 'Skip to content';
    }),
  );
  check(
    'main is focusable via tabIndex=-1',
    (await a11yPage.locator('main#main[tabindex="-1"]').count()) === 1,
  );
  await a11y.close();

  // ---- theme (DoD 9) ----------------------------------------------------
  check(
    'theme toggle offers Light, Dark and System',
    await (async () => {
      const togglePage = await ctx.newPage();
      await togglePage.goto(`${BASE}/`, { waitUntil: 'load' });
      await togglePage.getByRole('button', { name: 'Change theme' }).click();
      await togglePage.waitForTimeout(200);
      const labels = await togglePage.getByRole('menuitemradio').allTextContents();
      const checked = await togglePage
        .getByRole('menuitemradio')
        .evaluateAll((els) => els.some((el) => el.getAttribute('aria-checked') === 'true'));
      await togglePage.getByRole('menuitemradio', { name: 'Dark' }).click();
      await togglePage.waitForTimeout(250);
      const dark = await togglePage.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );
      return labels.join(',') === 'Light,Dark,System' && checked && dark;
    })(),
  );

  // ---- loading state (DoD 5) --------------------------------------------
  // Verified against `/slow-probe`, a temporary awaiting route that was then
  // deleted: `(shell)/loading.tsx` rendered a `role="status" aria-label="Loading"`
  // region with **no** spinner while the RSC payload was in flight. Re-checking it
  // here would require shipping that route. The streamed HTML for the detail route
  // still carries the fallback (asserted below, which is the part that stays true).
  const streamed = await page.request.get(`${BASE}/articles/deploying-the-api-to-production`);
  const streamedHtml = await streamed.text();
  check(
    'detail route streams a labelled skeleton fallback',
    (streamedHtml.match(/aria-label="Loading"/g) ?? []).length >= 1,
  );
  check('no spinner is streamed anywhere', !streamedHtml.includes('animate-spin'));

  // ---- back to top (DoD: detail "very long article") -------------------
  // The reveal threshold is 2000px of scroll depth, so the viewport has to be
  // shorter than the article by more than that for the control to be reachable.
  const shortCtx = await b.newContext({ viewport: { width: 1280, height: 200 } });
  const shortPage = await shortCtx.newPage();
  await shortPage.goto(`${BASE}/articles/deploying-the-api-to-production`, { waitUntil: 'load' });
  await shortPage.waitForTimeout(500);
  check(
    'Back to top hidden at the top',
    (await shortPage.getByRole('button', { name: 'Back to top' }).count()) === 0,
  );
  await shortPage.evaluate(() => window.scrollTo(0, 1990));
  await shortPage.waitForTimeout(350);
  check(
    'Back to top still hidden below 2000px',
    (await shortPage.getByRole('button', { name: 'Back to top' }).count()) === 0,
  );
  await shortPage.evaluate(() => window.scrollTo(0, 2050));
  await shortPage.waitForTimeout(350);
  check(
    'Back to top appears past 2000px',
    (await shortPage.getByRole('button', { name: 'Back to top' }).count()) === 1,
  );
  await shortCtx.close();

  await b.close();
  console.log(
    failures.length === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures.length} FAILURES:\n - ${failures.join('\n - ')}`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
